import plugin from '../../../lib/plugins/plugin.js'
import { Cultivation } from './cultivation.js'

export class Battle extends plugin {
    constructor() {
        super({
            name: '[XiuXian]战斗',
            dsc: '修仙战斗系统',
            event: 'message',
            priority: 5,
            rule: [
                { reg: /^#战斗$/, fnc: 'fight' },
                { reg: /^#pvp/, fnc: 'pvp' }
            ]
        })
        this.cultivation = new Cultivation()
    }

    async fight(e) {
        const player = await this.cultivation.getPlayer(e.user_id)
        if (!player) return e.reply("请先创建角色")

        const monster = this.getRandomMonster(player.level)
        const playerPower = this.calculatePlayerPower(player)

        if (playerPower > monster.power) {
            player.cultivation += monster.reward
            await this.cultivation.checkLevelUp(player)
            await this.cultivation.savePlayer(player)
            return e.reply(`你战胜了${monster.name}，获得${monster.reward}点修为奖励！`)
        } else {
            return e.reply(`你不敌${monster.name}，请继续修炼！`)
        }
    }

    async pvp(e) {
        const [, opponentName] = e.msg.split(/\s+/)
        const player = await this.cultivation.getPlayer(e.user_id)
        if (!player) return e.reply("请先创建角色")

        const opponent = await this.cultivation.getPlayerByName(opponentName)
        if (!opponent) return e.reply("找不到该对手，请确认用户名是否正确")

        const playerPower = this.calculatePlayerPower(player)
        const opponentPower = this.calculatePlayerPower(opponent)

        if (playerPower > opponentPower) {
            const reward = Math.floor(opponentPower / 10)
            player.cultivation += reward
            await this.cultivation.checkLevelUp(player)
            await this.cultivation.savePlayer(player)
            return e.reply(`你战胜了${opponentName}，获得${reward}点修为奖励！`)
        } else if (playerPower < opponentPower) {
            return e.reply(`你不敌${opponentName}，请继续修炼！`)
        } else {
            return e.reply(`与${opponentName}战成平手，不分胜负！`)
        }
    }

    calculatePlayerPower(player) {
        let power = player.level * 5
        for (const skill of player.skills) {
            power += this.cultivation.config.skills[skill].power
        }
        return power
    }

    getRandomMonster(playerLevel) {
        // 这里需要实现获取随机怪物的逻辑
        // 可以根据玩家等级来选择合适的怪物
        return {
            name: "野怪",
            power: playerLevel * 4,
            reward: playerLevel * 2
        }
    }
}