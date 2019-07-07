import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { createInterface } from 'readline';
import { TranscodeWorkerParam } from '.';
import { config } from '../../config';
import {
  FileSource,
  FileSourceDocument,
  SourceStatus,
} from '../../models/FileSource';
import { Manifest, TranscodeStatus } from '../../models/TranscodedSource';
import { AudioStream, VideoStream } from '../../types/ffprobe';
import { transcodeLogger } from '../../utils/logging';
import { ffprobe } from '../../utils/transcode/ffprobe';

export class Transcoder extends EventEmitter {
  private source: FileSourceDocument | null = null;
  private ffmpeg?: ChildProcessWithoutNullStreams;

  transcodedDuration = 0;

  get progress() {
    if (!this.source || !this.source.duration) return 0;
    return Math.ceil(this.source.duration / this.transcodedDuration);
  }

  constructor(private params: TranscodeWorkerParam) {
    super();
  }

  async lookup() {
    this.source = await FileSource.findById(this.params.sourceId);
    if (!this.source) throw new Error('source not found');

    if (this.source.status !== 'pending')
      throw new Error('the source has already been transcoded or failed');
    if (this.source.source.status !== SourceStatus.Available)
      throw new Error('the source is not available');
  }

  private async probeSource() {
    if (!this.source) throw new Error('source not set');

    const result = await ffprobe(
      `${config.paths.source}/${this.source.id}/source.${
        this.source.source.extension
      }`,
    );

    const audio = result.streams.find(
      (stream): stream is AudioStream => stream.codec_type === 'audio',
    );
    const video = result.streams.find(
      (stream): stream is VideoStream => stream.codec_type === 'video',
    );

    if (!video) {
      throw new Error('no video');
    }
    if (audio) {
      if (audio.channels > 2) {
        throw new Error('audio must be stereo or mono');
      }
    }

    this.source.source.width = video.width;
    this.source.source.height = video.height;
    this.source.duration = Number(video.duration);

    await this.source.save();
  }

  async probe() {
    if (!this.source) throw new Error('source not set');
    if (this.source.source.width) throw new Error('already probed');

    try {
      await this.probeSource();
    } catch (err) {
      transcodeLogger.error('failed to probe', err);

      this.source.error = err.toString();
      await this.setStatus(TranscodeStatus.Failed);
    }
  }

  // probed?
  get transcodable() {
    return this.source && this.source.source.width;
  }

  private get transcodeArgs() {
    if (!this.source) throw new Error('source not set');

    return [
      '-i',
      `${config.paths.source}/${this.source.id}/source.${
        this.source.source.extension
      }`,
      '-c',
      'copy',
      '-f',
      'hls',
      ...this.params.transcodeArgs,
      '-hls_time',
      '5',
      '-hls_flags',
      'single_file',
      '-hls_list_size',
      '1',
      '-hls_segment_filename',
      `${config.paths.source}/${this.source.id}/stream.m2ts`,
      '-',
    ];
  }

  private async setStatus(status: TranscodeStatus) {
    if (!this.source) throw new Error('source not set');

    // ここで、データ壊れてるかも
    await this.source.updateOne({
      $set: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async transcode() {
    await this.setStatus(TranscodeStatus.Running);

    return new Promise<void>((resolve, reject) => {
      const args = this.transcodeArgs;
      transcodeLogger.debug('transcode params', ...args);

      this.ffmpeg = spawn('ffmpeg', args, {
        stdio: 'pipe',
      });

      transcodeLogger.info('transcoder pid:', this.ffmpeg.pid);

      const readline = createInterface(this.ffmpeg.stdout);
      const buffer: string[] = [];
      readline.on('line', async line => {
        if (!this.source) {
          // 普通はありえない
          transcodeLogger.fatal('no source');
          this.ffmpeg!.kill('KILL');
          return reject('no source');
        }

        try {
          if (line.match(/#EXTM3U/)) {
            if (
              buffer
                .join('\n')
                .match(/#EXTINF:([\d\.]+),[\n\r]+#EXT-X-BYTERANGE:(\d+)@(\d+)/)
            ) {
              const [duration, length, offset] = [
                Number(RegExp.$1),
                Number(RegExp.$2),
                Number(RegExp.$3),
              ];

              transcodeLogger.trace(
                'segment',
                this.source.id,
                duration,
                length,
                offset,
              );

              const item: Manifest = [offset, length, duration, 0];

              await this.source.updateOne({
                $push: {
                  manifest: item,
                },
                $set: {
                  updatedAt: new Date(),
                },
              });
              this.transcodedDuration += duration;

              this.emit('duration', this.transcodedDuration);
            }

            buffer.splice(0, buffer.length);
          }
          buffer.push(line);
        } catch (err) {
          transcodeLogger.error('failed to update hls manifest', err);
          if (this.ffmpeg) {
            this.ffmpeg.kill('KILL');
          }
        }
      });

      this.ffmpeg.on('error', async err => {
        await this.setStatus(TranscodeStatus.Failed);
        reject(err);
      });

      this.ffmpeg.on('close', async code => {
        if (code === 0) {
          transcodeLogger.info(
            'transcode successful',
            'duration:',
            this.transcodedDuration,
          );

          await this.setStatus(TranscodeStatus.Success);
          resolve();
        } else {
          transcodeLogger.error('ffmpeg exit code', code);

          await this.setStatus(TranscodeStatus.Failed);
          reject(`exit code: ${code}`);
        }
      });
    });
  }
}
