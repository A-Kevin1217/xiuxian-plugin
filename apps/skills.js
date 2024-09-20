import { readFile } from 'fs/promises'
import { join } from 'path'

class Skills {
  constructor(plugin) {
    this.plugin = plugin;
    this.skills = {};
    this.loadSkills();
  }

  async loadSkills() {
    try {
      const data = await readFile(join(__dirname, '../resources/skills.json'), 'utf8');
      this.skills = JSON.parse(data);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  }

  async learnSkill(userId, skillName) {
    await this.loadSkills(); // 确保技能数据是最新的
    const player = this.plugin.players.get(userId);
    if (!player) return "请先创建角色";
    if (!this.skills[skillName]) return "该技能不存在";
    if (player.skills.includes(skillName)) return "已学会该技能";

    // 检查玩家等级是否足够学习该技能
    const requiredLevel = Math.floor(this.skills[skillName].power / 2);
    if (player.level < requiredLevel) {
      return `你的等级不足以学习此技能，需要等级：${requiredLevel}`;
    }

    player.skills.push(skillName);
    this.plugin.savePlayers();
    return `成功学习技能：${skillName}（${this.skills[skillName].description}）`;
  }

  async getSkillList() {
    await this.loadSkills(); // 确保技能数据是最新的
    return Object.entries(this.skills).map(([name, data]) => 
      `${name}：威力 ${data.power}，消耗 ${data.cost}，${data.description}`
    ).join('\n');
  }
}

export default Skills;