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

import { AuthenticationError } from 'apollo-server-core';
import {
  defaultFieldResolver,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLObjectType,
} from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GqlContext } from '../context';

interface DeviceObjectType extends GraphQLObjectType {
  _deviceFieldsWrapped: boolean;
  _deviceAuthRequired: boolean;
}

interface DeviceInterfaceType extends GraphQLInterfaceType {
  _deviceFieldsWrapped: boolean;
  _deviceAuthRequired: boolean;
}

interface DeviceField extends GraphQLField<unknown, unknown> {
  _deviceFieldsWrapped: boolean;
  _deviceAuthRequired: boolean;
}

export class DeviceDirective extends SchemaDirectiveVisitor {
  visitObject(type: DeviceObjectType) {
    this.ensureFieldsWrapped(type);
    type._deviceAuthRequired = true;
  }
  // Visitor methods for nested types like fields and arguments
  // also receive a details object that provides information about
  // the parent and grandparent types.
  visitFieldDefinition(
    field: DeviceField,
    details: {
      objectType: DeviceObjectType | DeviceInterfaceType;
    },
  ) {
    this.ensureFieldsWrapped(details.objectType);
    field._deviceAuthRequired = true;
  }

  private ensureFieldsWrapped(
    objectType: DeviceObjectType | DeviceInterfaceType,
  ) {
    if (objectType._deviceFieldsWrapped) return;
    objectType._deviceFieldsWrapped = true;

    const fields = objectType.getFields();

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName] as DeviceField;
      const { resolve = defaultFieldResolver, subscribe } = field;

      field.resolve = async function(...args) {
        if (!field._deviceAuthRequired && !objectType._deviceAuthRequired)
          return resolve.apply(this, args);

        const context = args[2] as GqlContext;
        const device = context.deviceInfo;
        if (!device) {
          throw new AuthenticationError('not authorized device');
        }

        return resolve.apply(this, args);
      };
      if (subscribe) {
        field.subscribe = async function(...args) {
          if (!field._deviceAuthRequired && !objectType._deviceAuthRequired)
            return subscribe.apply(this, args);

          const context = args[2] as GqlContext;
          const device = context.deviceInfo;
          if (!device) {
            throw new AuthenticationError('not authorized device');
          }

          return subscribe.apply(this, args);
        };
      }
    });
  }
}
