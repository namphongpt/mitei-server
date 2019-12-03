import { TranscodeStatus } from '@mitei/server-models';
import { FileSourceResolvers } from '../../generated/graphql';
import { transcodeWorker } from '../../workers/transcode';
import { transcodedSourceResolvers } from './transcoded-source';

export const fileSourceResolvers: FileSourceResolvers = {
  ...transcodedSourceResolvers,
  transcodeProgress: async source => {
    return await transcodeWorker.getTranscodeJobProgress(source);
  },
  status: async source => {
    if (source.status === TranscodeStatus.Pending) {
      const job = await transcodeWorker.getTranscodeJob(source);
      if (job) return TranscodeStatus.Waiting;
    }
    return source.status;
  },
  isProbing: async source => {
    const job = await transcodeWorker.getProbeJob(source);
    if (!job) return false;

    const state = await job.getState();
    return state !== 'completed' && state !== 'failed';
  },
};
