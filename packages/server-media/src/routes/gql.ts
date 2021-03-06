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

import { UserDocument, ViewerDevice } from '@mitei/server-models';
import { combineResolvers } from 'apollo-resolvers';
import { ContextFunction } from 'apollo-server-core';
import { ApolloServer, gql } from 'apollo-server-express';
import { Request } from 'express';
import { readFileSync } from 'fs';
import { ConnectionContext } from 'subscriptions-transport-ws';
import * as WebSocket from 'ws';
import { resolvers as apiResolvers } from '../api';
import { GqlContext } from '../api/context';
import { AuthDirective } from '../api/directives/auth';
import { DeviceDirective } from '../api/directives/device';
import { parseToken, TokenType } from '../streaming/viewer/token';
import { authenticateWebSocket } from '../utils/auth';

type WSContext = { request: Request };
const createContext: ContextFunction<
  { req?: Request; connection: { context?: WSContext } },
  GqlContext
> = async ({ req, connection }) => {
  const request =
    req || (connection.context ? connection.context.request : null);
  if (!request) return { requestAddr: '' }; // on subscription

  const requestAddr = request.ip;
  const newContext: GqlContext = {
    requestAddr,
  };
  if (request.user) {
    newContext.userInfo = request.user as UserDocument;
  }
  if (typeof request.headers['x-device-token'] === 'string') {
    const { type, deviceId } = parseToken(
      request.headers['x-device-token'] as string,
    );
    if (type === TokenType.AuthorizedClient) {
      const device = await ViewerDevice.findById(deviceId);
      if (device) {
        newContext.deviceInfo = device;
      }
    }
  }

  return newContext;
};

const subscriptionOnConnect = async (
  connectionParams: unknown,
  _websocket: WebSocket,
  { request }: ConnectionContext,
): Promise<WSContext> => {
  await authenticateWebSocket(request);
  const params = connectionParams as Record<string, string>;
  Object.keys(params).forEach(key => (request.headers[key] = params[key]));
  return { request: request as Request };
};

const resolvers = combineResolvers([apiResolvers]);
const typeDefs = ['app', 'channel', 'schedule', 'source', 'user', 'viewer'].map(
  name =>
    gql(
      readFileSync(require.resolve(`@mitei/schema/${name}.gql`), {
        encoding: 'utf8',
      }),
    ),
);

export const gqlServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext,
  subscriptions: {
    path: '/gql/ws',
    onConnect: subscriptionOnConnect,
  },
  schemaDirectives: {
    auth: AuthDirective,
    deviceOnly: DeviceDirective,
  },
  playground: {
    tabs: [
      {
        endpoint: '/gql',
        query: '',
      },
    ],
    settings: {
      'request.credentials': 'include',
      // tslint:disable-next-line:no-any
    } as any,
  },
});
