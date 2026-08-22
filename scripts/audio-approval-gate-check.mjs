import fs from 'node:fs';

const manifestPath = 'docs/golden/audio-review-manifest-v1.md';

if (!fs.existsSync(manifestPath)) {
  console.error('AUDIO APPROVAL FAIL: missing review manifest');
  process.exit(1);
}

const manifest = fs.readFileSync(manifestPath, 'utf8');

const required = [
  'Sulafat',
  'Iapetus',
  'humanApproved: false',
  'productionAllowed: false',
  'publishAllowed: false',
];

for (const item of required) {
  if (!manifest.includes(item)) {
    console.error(`AUDIO APPROVAL FAIL: missing ${item}`);
    process.exit(1);
  }
}

console.log('AUDIO APPROVAL PASS: human approval boundary enforced');
