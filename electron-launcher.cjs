const { spawnSync } = require('child_process');
const path = require('path');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const isBuild = process.argv.includes('--build');

if (isBuild) {
  const builderPath = path.join(__dirname, 'node_modules', '.bin', 'electron-builder.cmd');
  const result = spawnSync(builderPath, [], { stdio: 'inherit', env, shell: true });
  process.exit(result.status || 0);
} else {
  const electronPath = require('electron');
  const result = spawnSync(electronPath, ['.'], { stdio: 'inherit', env });
  process.exit(result.status || 0);
}
