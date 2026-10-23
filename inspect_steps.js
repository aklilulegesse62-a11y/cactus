const fs = require('fs');
const lines = fs.readFileSync('C:/Users/gizaw/.gemini/antigravity/brain/82211e69-63e8-43a0-a8b3-65735b4c695d/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

const targetSteps = [4078, 4086, 4242, 4248, 4254, 4273, 4481, 4485, 4552, 4556];
for (const step of targetSteps) {
  for (const line of lines) {
    if (line.includes(`"step_index":${step}`) || line.includes(`"step_index": ${step}`)) {
      try {
        const o = JSON.parse(line);
        console.log(`\n=================== STEP ${step} ===================`);
        if (o.tool_calls && o.tool_calls[0]) {
          const tc = o.tool_calls[0];
          console.log('Action:', tc.args.Instruction || tc.args.Description);
          console.log('TargetContent:\n', tc.args.TargetContent);
          console.log('ReplacementContent:\n', tc.args.ReplacementContent);
        }
      } catch(e) {}
      break;
    }
  }
}
