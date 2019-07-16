import { QueryResolvers } from '../../../generated/graphql';
import { Channel } from '../../../models/streaming/Channel';
import { ensureLoggedInAsAdmin } from '../../../utils/gql/ensureUser';

export const channelQueryResolvers: QueryResolvers = {
  channelList: ensureLoggedInAsAdmin(async (_parent, { take, skip }) => {
    const total = await Channel.countDocuments();
    const result = await Channel.find()
      .skip(skip || 0)
      .limit(take || 10);

    return {
      channels: result,
      total,
    };
  }),
};
