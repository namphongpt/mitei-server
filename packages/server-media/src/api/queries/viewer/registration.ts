/*
 * This file is part of Mitei Server.
 * Copyright (c) 2019 f0reachARR <f0reach@f0reach.me>
 *
 * Mitei Server is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * Mitei Server is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Mitei Server.  If not, see <http://www.gnu.org/licenses/>.
 */

import { QueryResolvers } from '../../../generated/graphql';
import { parseToken, TokenType } from '../../../streaming/viewer/token';
import { ViewerChallengeData } from '../../../types/viewer';
import { redis, redisKeys } from '../../../utils/redis';

export const viewerRegistrationQueryResolvers: QueryResolvers = {
  viewerRequests: async () => {
    const requestIds = (
      await redis.keys(redisKeys.deviceChallenge('*'))
    ).map(key => key.replace(redisKeys.deviceChallenge(''), ''));
    if (requestIds.length === 0) {
      return [];
    }

    const requests: ViewerChallengeData[] = ((await redis.mget(
      ...requestIds.map(id => redisKeys.deviceChallenge(id)),
    )) as string[]).map(data => JSON.parse(data));

    return requestIds
      .filter((_id, i) => !requests[i].accept)
      .map((id, i) => ({
        id,
        requestFrom: requests[i].from,
        code: requests[i].code,
        type: requests[i].type,
        createdAt: new Date(requests[i].date),
      }));
  },
  viewerChallengeResult: async (_parent, { token }) => {
    const { type, deviceId } = parseToken(token);
    if (type !== TokenType.Registration) {
      throw new Error('not registration token');
    }

    const challenge = await redis.get(redisKeys.deviceChallenge(deviceId));
    if (!challenge) {
      throw new Error('invalid request');
    }

    const challengeData: ViewerChallengeData = JSON.parse(challenge);

    return {
      token: challengeData.token || '',
      success: challengeData.accept,
    };
  },
  viewerInfo: async (_parent, _args, { deviceInfo }) => {
    if (deviceInfo) {
      return deviceInfo;
    }
    return null;
  },
};
