import { Channel } from '@mitei/server-models';
import { QueryResolvers } from '../../../generated/graphql';

export const channelQueryResolvers: QueryResolvers = {
  channelList: async (_parent, { take, skip }) => {
    const total = await Channel.countDocuments();
    const result = await Channel.find()
      .skip(skip || 0)
      .limit(take || 10);

    return {
      channels: result,
      total,
    };
  },
  channel: async (_parent, { id }) => {
    return (await Channel.findById(id)) || null;
  },
};