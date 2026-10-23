const fs = require('fs');
const lines = fs.readFileSync('C:/Users/gizaw/.gemini/antigravity/brain/82211e69-63e8-43a0-a8b3-65735b4c695d/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (const step of [4242, 4248, 4254]) {
  for (const line of lines) {
    if (line.includes(`"step_index":${step}`) || line.includes(`"step_index": ${step}`)) {
      const o = JSON.parse(line);
      console.log(`\n=================== EXACT TARGET CONTENT FOR STEP ${step} ===================`);
      console.log(o.tool_calls[0].args.TargetContent);
      break;
    }
  }
}
