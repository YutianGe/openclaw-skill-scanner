#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import App from '../src/tui/App.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsRoot =
  process.env.OPENCLAW_SKILLS_ROOT ||
  path.join(process.env.HOME || '', '.agents', 'skills');

render(
  React.createElement(App, {
    skillsRoot,
    projectRoot: path.join(__dirname, '..'),
  }),
);
