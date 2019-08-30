import { config } from '../../config';
import { RtmpInputResolvers } from '../../generated/graphql';

export const rtmpInputResolvers: RtmpInputResolvers = {
  createdBy: async source => {
    await source.populate('createdBy', '-token -tokenSecret').execPopulate();
    if (!source.createdBy) throw new Error('failed to populate');

    return source.createdBy;
  },
  preset: async source => {
    await source.populate('preset').execPopulate();
    if (!source.preset) throw new Error('failed to populate');

    return source.preset;
  },
  publishUrl: source => {
    return `${config.streaming.rtmpClientEndpoint}/${source.id}`;
  },
};