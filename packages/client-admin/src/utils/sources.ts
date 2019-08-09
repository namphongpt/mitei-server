import { Duration } from 'luxon';
import {
  GetFileSourcesSimpleQuery,
  GetRtmpInputListSimpleQuery,
  RtmpStatus,
  SourceStatus,
  TranscodeStatus,
} from '../api/generated/graphql';

export const transcodeStatusText = {
  [TranscodeStatus.Pending]: '未変換',
  [TranscodeStatus.Waiting]: '変換待機中',
  [TranscodeStatus.Running]: '変換中',
  [TranscodeStatus.Failed]: '変換エラー',
  [TranscodeStatus.Success]: '変換済み',
};

export const fileSourceSimpleDetailString = (
  info: GetFileSourcesSimpleQuery['fileSourceList']['sources'][0],
) => {
  if (info.source.status === SourceStatus.Uploading) {
    return 'アップロード待機中/エラー';
  }

  if (!info.duration) {
    return `${transcodeStatusText[info.status]}`;
  }
  return `${transcodeStatusText[info.status]} ${Math.ceil(
    info.transcodeProgress || 0,
  ) || ''} 長さ: ${Duration.fromMillis(info.duration * 1000).toFormat(
    'hh:mm:ss',
  )}`;
};

export const rtmpStatusText = {
  [RtmpStatus.Unused]: '待機中',
  [RtmpStatus.Live]: '配信中',
};

export const rtmpInputSimpleString = (
  input: GetRtmpInputListSimpleQuery['rtmpInputList']['inputs'][0],
) => {
  return `${rtmpStatusText[input.status]} / 配信先: ${
    input.publishUrl
  } / エンコ設定: ${input.preset.name}`;
};

export const fileStatusText = {
  [SourceStatus.Available]: 'ファイルあり',
  [SourceStatus.Uploading]: 'アップロード待機中/エラー',
  [SourceStatus.Deleted]: '削除済み',
};
