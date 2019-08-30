import { ChannelResolvers } from '../../generated/graphql';

export const channelResolvers: ChannelResolvers = {
  createdBy: async source => {
    await source.populate('createdBy', '-token -tokenSecret').execPopulate();
    if (!source.createdBy) throw new Error('failed to populate');

    return source.createdBy;
  },
  fillerSources: async channel => {
    await channel.populate('fillerSources').execPopulate();
    if (!channel.fillerSources) throw new Error('failed to populate');

    return channel.fillerSources;
  },
};