import plugin from '../../../lib/plugins/plugin.js'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import Skills from './skills.js'
import config from '../config/config.js'

export class Cultivation extends plugin {
    constructor() {
        super({
            name: '[XiuXian]修炼',
            dsc: '修仙修炼系统',
            event: 'message',
            priority: 5,
            rule: [
                { reg: /^#创建角色/, fnc: 'createPlayer' },
                { reg: /^#修炼$/, fnc: 'cultivate' },
                { reg: /^#状态$/, fnc: 'getStatus' },
                { reg: /^#休息$/, fnc: 'rest' },
                { reg: /^#使用 /, fnc: 'useConsumable' },
                { reg: /^#学习技能 /, fnc: 'learnSkill' },
                { reg: /^#技能列表$/, fnc: 'listSkills' },
                { reg: /^#野外探索$/, fnc: 'exploreWilderness' },
                { reg: /^#闭关修炼 \d+$/, fnc: 'secludedCultivation' },
            ]
        })
        this.players = new Map()
        this.loadConfig()
        this.skills = new Skills(this)
        this.loadPlayers()
        this.forbiddenWords = config.forbiddenWords;
    }

    async loadConfig() {
        try {
            const realmsData = await readFile(join(__dirname, '../resources/realms.json'), 'utf8')
            this.config = {
                realms: JSON.parse(realmsData),
                consumables: {
                    "聚灵丹": { cultivation: 50, energy: 30 },
                    "还灵散": { cultivation: 0, energy: 50 },
                    "破境丹": { cultivation: 100, energy: 0 }
                }
            }
        } catch (error) {
            console.error('Failed to load config:', error)
        }
    }

    async createPlayer(e) {
        const userId = e.user_id
        const name = e.msg.split(' ')[1] || `修仙者${userId}`

        if (this.players.has(userId)) return e.reply("你已经创建过角色了")

        // 检查名字是否包含违禁词
        if (this.containsForbiddenWord(name)) {
            return e.reply("角色名称包含违禁词，请重新选择一个名字")
        }

        const player = {
            name,
            realm: this.config.realms[0],
            level: 1,
            cultivation: 0,
            skills: [],
            energy: 100
        }

        this.players.set(userId, player)
        await this.savePlayers()

        return e.reply(`${player.name} 已开始修仙之路，当前境界：${player.realm}\n输入 #修仙帮助 可查看所有可用命令。`)
    }

    containsForbiddenWord(name) {
        return this.forbiddenWords.some(word => name.toLowerCase().includes(word.toLowerCase()));
    }

    async cultivate(e) {
        const player = this.players.get(e.user_id)
        if (!player) return e.reply("请先创建角色")

        // 引入修炼失败的概率
        const failureChance = 0.2 + (player.level * 0.01) // 基础20%失败率，每级增加1%
        if (Math.random() < failureChance) {
            player.energy -= 5
            await this.savePlayers()
            return e.reply("修炼失败，消耗5点灵力")
        }

        // 增加修为获取的随机性
        const baseCultivation = Math.floor(Math.random() * 10) + 1
        const levelMultiplier = 1 + (player.level * 0.05) // 每增加5%的修为获取
        const gainedCultivation = Math.floor(baseCultivation * levelMultiplier)

        player.cultivation += gainedCultivation
        player.energy -= 10

        if (player.energy < 0) {
            player.energy = 0
            await this.savePlayers()
            return e.reply("灵力耗尽，无法继续修炼")
        }

        const levelUpMessage = await this.checkLevelUp(player)
        await this.savePlayers()

        let replyMessage = `修炼成功，获得${gainedCultivation}点修为，当前修为：${player.cultivation}，剩余灵力：${player.energy}`
        if (levelUpMessage) replyMessage += '\n' + levelUpMessage

        return e.reply(replyMessage)
    }

    async getStatus(e) {
        const player = this.players.get(e.user_id)
        if (!player) return e.reply("请先创建角色")

        const skillsInfo = await Promise.all(player.skills.map(async (skill) => {
            const skillData = (await this.skills.loadSkills())[skill]
            return `${skill}（威力：${skillData.power}，消耗：${skillData.cost}）`
        }))

        return e.reply(`
            角色：${player.name}
            境界：${player.realm}
            等级：${player.level}
            修为：${player.cultivation}
            灵力：${player.energy}
            已学技能：
            ${skillsInfo.join('\n')}
        `)
    }

    async rest(e) {
        const player = this.players.get(e.user_id)
        if (!player) return e.reply("请先创建角色")

        const recoveredEnergy = Math.min(30, 100 - player.energy)
        player.energy += recoveredEnergy
        await this.savePlayers()

        return e.reply(`休息完毕，恢复了${recoveredEnergy}点灵力，当前灵力：${player.energy}`)
    }

    async checkLevelUp(player) {
        const currentRealmIndex = this.config.realms.indexOf(player.realm)
        const cultivationNeeded = player.level * 100 * (1 + (Math.floor(currentRealmIndex / 3) * 0.5)) // 每个主要境界增加难度

        if (player.cultivation >= cultivationNeeded && currentRealmIndex < this.config.realms.length - 1) {
            // 添加突破失败的概率
            const breakthroughChance = 0.5 - (Math.floor(currentRealmIndex / 3) * 0.05) // 每个主要境界降低5%的突破概率
            if (Math.random() > breakthroughChance) {
                player.cultivation = Math.floor(player.cultivation * 0.9) // 失败后损失10%修为
                return "突破失败，损失部分修为"
            }

            player.level++
            if (player.level % 3 === 0) { // 每3级提升一个小境界
                player.realm = this.config.realms[currentRealmIndex + 1]
                return `突破成功！当前境界：${player.realm}`
            }
            return `修为提升！当前等级：${player.level}`
        }
        return null
    }

    async loadPlayers() {
        try {
            const data = await readFile(join(__dirname, '../data/players.json'), 'utf8')
            this.players = new Map(JSON.parse(data))
        } catch (error) {
            console.error('Failed to load players:', error)
        }
    }

    async savePlayers() {
        try {
            const data = JSON.stringify(Array.from(this.players.entries()))
            await writeFile(join(__dirname, '../data/players.json'), data, 'utf8')
        } catch (error) {
            console.error('Failed to save players:', error)
        }
    }

    async getPlayer(userId) {
        return this.players.get(userId)
    }

    async getPlayerByName(name) {
        for (const player of this.players.values()) {
            if (player.name === name) {
                return player
            }
        }
        return null
    }

    async savePlayer(player) {
        this.players.set(player.id, player)
        await this.savePlayers()
    }

    async useConsumable(e) {
        const player = this.players.get(e.user_id)
        if (!player) return e.reply("请先创建角色")

        const consumableName = e.msg.split(' ')[1]
        const consumable = this.config.consumables[consumableName]

        if (!consumable) return e.reply("未知的消耗品")

        if (!player.consumables || player.consumables[consumableName] <= 0) {
            return e.reply("你没有这个消耗品")
        }

        player.consumables[consumableName]--
        player.cultivation += consumable.cultivation
        player.energy = Math.min(player.energy + consumable.energy, 100)

        await this.savePlayers()

        return e.reply(`使用${consumableName}成功，获得${consumable.cultivation}点修为，恢复${consumable.energy}点灵力`)
    }

    async learnSkill(e) {
        const player = this.players.get(e.user_id)
        if (!player) return e.reply("请先创建角色")

        const skillName = e.msg.split(' ')[1]
        const result = await this.skills.learnSkill(e.user_id, skillName)
        return e.reply(result)
    }

    async listSkills(e) {
        return e.reply("可学习的技能列表：\n" + await this.skills.getSkillList())
    }

    async exploreWilderness(e) {
        const player = this.players.get(e.user_id)
        if (!player) return e.reply("请先创建角色")

        if (player.energy < 20) return e.reply("灵力不足，无法进行野外探索")

        const events = [
            { type: 'monster', chance: 0.3 },
            { type: 'treasure', chance: 0.2 },
            { type: 'cultivation', chance: 0.15 },
            { type: 'nothing', chance: 0.05 },
            { type: 'trap', chance: 0.1 },
            { type: 'secluded_master', chance: 0.05 },
            { type: 'ancient_ruin', chance: 0.1 },
            { type: 'natural_disaster', chance: 0.05 }
        ]

        const randomEvent = this.getRandomEvent(events)
        player.energy -= 20

        switch (randomEvent.type) {
            case 'monster':
                return this.handleMonsterEncounter(e, player)
            case 'treasure':
                return this.handleTreasureFound(e, player)
            case 'cultivation':
                return this.handleCultivationSpot(e, player)
            case 'nothing':
                return e.reply("这次探索没有发现什么特别的东西。")
            case 'trap':
                return this.handleTrap(e, player)
            case 'secluded_master':
                return this.handleSecludedMaster(e, player)
            case 'ancient_ruin':
                return this.handleAncientRuin(e, player)
            case 'natural_disaster':
                return this.handleNaturalDisaster(e, player)
        }
    }

    getRandomEvent(events) {
        const totalChance = events.reduce((sum, event) => sum + event.chance, 0)
        let random = Math.random() * totalChance
        for (const event of events) {
            if (random < event.chance) return event
            random -= event.chance
        }
    }

    async handleMonsterEncounter(e, player) {
        // 这里可以调用战斗系统，现在我们简单模拟一下
        const monsterPower = Math.floor(Math.random() * 50) + player.level * 2
        const playerPower = player.level * 3 + player.skills.length * 2

        if (playerPower > monsterPower) {
            player.cultivation += 50
            return e.reply("你遇到了一只妖兽，经过激烈的战斗，你战胜了它！获得50点修为。")
        } else {
            player.energy = Math.max(0, player.energy - 30)
            return e.reply("你遇到了一只强大的妖兽，不敌之下只能仓皇逃跑，消耗了30点灵力。")
        }
    }

    async handleTreasureFound(e, player) {
        const treasureTypes = ['丹药', '法器', '功法秘籍']
        const treasureType = treasureTypes[Math.floor(Math.random() * treasureTypes.length)]
        player.cultivation += 100
        return e.reply(`你发现了一处隐秘的洞穴，里面藏有${treasureType}！获得100点修为。`)
    }

    async handleCultivationSpot(e, player) {
        const cultivationGain = Math.floor(Math.random() * 100) + 50
        player.cultivation += cultivationGain
        return e.reply(`你找到了一处灵气充沛的修炼宝地，获得${cultivationGain}点修为。`)
    }

    async secludedCultivation(e) {
        const player = this.players.get(e.user_id)
        if (!player) return e.reply("请先创建角色")

        const days = parseInt(e.msg.split(' ')[1])
        if (isNaN(days) || days <= 0) return e.reply("请输入有效的闭关天数")

        const energyNeeded = days * 10
        if (player.energy < energyNeeded) return e.reply(`灵力不足，无法进行${days}天的闭关修炼`)

        player.energy -= energyNeeded
        const cultivationGain = Math.floor((Math.random() * 20 + 10) * days * (1 + player.level * 0.1))
        player.cultivation += cultivationGain

        const breakthroughChance = 0.05 * days
        let breakthroughMessage = ''
        if (Math.random() < breakthroughChance) {
            const levelUpMessage = await this.checkLevelUp(player)
            if (levelUpMessage) breakthroughMessage = '\n' + levelUpMessage
        }

        await this.savePlayers()

        return e.reply(`闭关${days}天结束，获得${cultivationGain}点修为。剩余灵力：${player.energy}${breakthroughMessage}`)
    }

    async handleTrap(e, player) {
        const trapTypes = ['毒阵', '幻阵', '困阵']
        const trapType = trapTypes[Math.floor(Math.random() * trapTypes.length)]
        const damage = Math.floor(Math.random() * 30) + 10
        player.energy = Math.max(0, player.energy - damage)
        await this.savePlayers()
        return e.reply(`你不小心触发了一个${trapType}，损失了${damage}点灵力。当前灵力：${player.energy}`)
    }

    async handleSecludedMaster(e, player) {
        const cultivationGain = Math.floor(Math.random() * 200) + 100
        player.cultivation += cultivationGain
        const randomSkill = Object.keys(this.skills.skills)[Math.floor(Math.random() * Object.keys(this.skills.skills).length)]
        if (!player.skills.includes(randomSkill)) {
            player.skills.push(randomSkill)
            await this.savePlayers()
            return e.reply(`你遇到了一位隐世高人，获得了${cultivationGain}点修为，并学会了${randomSkill}技能！`)
        } else {
            await this.savePlayers()
            return e.reply(`你遇到了一位隐世高人，获得了${cultivationGain}点修为！`)
        }
    }

    async handleAncientRuin(e, player) {
        const events = [
            { type: 'treasure', chance: 0.4 },
            { type: 'danger', chance: 0.3 },
            { type: 'enlightenment', chance: 0.3 }
        ]
        const result = this.getRandomEvent(events)

        switch (result.type) {
            case 'treasure':
                const treasureGain = Math.floor(Math.random() * 300) + 200
                player.cultivation += treasureGain
                await this.savePlayers()
                return e.reply(`你在古遗迹中发现了珍贵的宝物，获得了${treasureGain}点修为！`)
            case 'danger':
                const damage = Math.floor(Math.random() * 50) + 30
                player.energy = Math.max(0, player.energy - damage)
                await this.savePlayers()
                return e.reply(`你在探索古遗迹时触发了机关，损失了${damage}点灵力。当前灵力：${player.energy}`)
            case 'enlightenment':
                const levelUpMessage = await this.checkLevelUp(player)
                await this.savePlayers()
                return e.reply(`你在古迹中获得了顿悟，修为大涨！${levelUpMessage ? levelUpMessage : ''}`)
        }
    }

    async handleNaturalDisaster(e, player) {
        const disasters = ['雷劫', '火山爆发', '洪水', '地震']
        const disaster = disasters[Math.floor(Math.random() * disasters.length)]
        const damage = Math.floor(Math.random() * 70) + 50
        player.energy = Math.max(0, player.energy - damage)

        const survivalChance = 0.7 + (player.level * 0.01)
        if (Math.random() < survivalChance) {
            const cultivationGain = Math.floor(damage * 1.5)
            player.cultivation += cultivationGain
            await this.savePlayers()
            return e.reply(`你遭遇了${disaster}，虽然损失了${damage}点灵力，但因祸得福，获得了${cultivationGain}点修为！当前灵力：${player.energy}`)
        } else {
            player.cultivation = Math.floor(player.cultivation * 0.9)
            await this.savePlayers()
            return e.reply(`你遭遇了${disaster}，损失了${damage}点灵力和10%的修为。当前灵力：${player.energy}，当前修为：${player.cultivation}`)
        }
    }
}