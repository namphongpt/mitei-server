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

import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  appPort: Number(process.env.APP_PORT || 3000),
  callbackPort: Number(process.env.CALLBACK_PORT || 3001),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  streaming: {
    rtmpAddress: process.env.NGINX_RTMP_ADDR || '',
    rtmpClientEndpoint: process.env.NGINX_RTMP_ENDPOINT || '',
    rtmpControlEndpoint: process.env.NGINX_RTMP_CONTROL || '',
  },
  paths: {
    source: process.env.SOURCES_DIR || '/app/data/source',
    temp: process.env.UPLOAD_TEMP_DIR || '/app/data/tmp',
    resource: process.env.RESOURCE_DIR || '/app/resource',
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT || 6379),
  },
  mongo: process.env.MONGO_URI || 'mongodb://localhost/mitei',
  limit: {
    stream: Number(process.env.MAX_STREAM || 10),
    transcode: Number(process.env.MAX_TRANSCODE || 10),
  },
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY || '',
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '',
  },
  secrets: {
    session: process.env.SECRET_SESSION || '',
    segmentRef: process.env.SECRET_SEGREF || '',
    viewToken: process.env.SECRET_VIEW_TOKEN || '',
  },
  prod: process.env.NODE_ENV === 'production',
};
