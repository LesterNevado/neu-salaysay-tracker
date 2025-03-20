
// This file is maintained for backwards compatibility
// All new code should import directly from the new modules

import {
  logActivity,
  logLoginActivity,
  getActivityLogs
} from './activity';

import type {
  ActionType,
  StatusType
} from './activity';

export {
  logActivity,
  logLoginActivity,
  getActivityLogs
};

export type {
  ActionType,
  StatusType
};
