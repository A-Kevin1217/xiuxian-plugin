import { Cultivation } from './apps/cultivation.js'
import { Skills } from './apps/skills.js'
import { Battle } from './apps/battle.js'

export default class Button {
    constructor() {
        this.plugin = {
            name: 'XiuXian-Plugin',
            dsc: '修仙插件',
            priority: 5,
            rule: [
                { reg: /^#修仙菜单$/, fnc: 'showMenu' },
                { reg: /^#创建角色/, fnc: 'createCharacter' },
                { reg: /^#修炼$/, fnc: 'cultivate' },
                { reg: /^#学习技能/, fnc: 'learnSkill' },
                { reg: /^#战斗$/, fnc: 'fight' },
                { reg: /^#状态$/, fnc: 'status' },
                { reg: /^#休息$/, fnc: 'rest' },
                { reg: /^#pvp/, fnc: 'pvp' },
                { reg: /^#野外探索$/, fnc: 'exploreWilderness' },
                { reg: /^#闭关修炼 \d+$/, fnc: 'secludedCultivation' }
            ]
        }
        this.cultivation = new Cultivation()
        this.skills = new Skills(this.cultivation)
        this.battle = new Battle(this.cultivation)
    }

    async showMenu(e) {
        return Bot.Button([
            [bd(0, '创建角色', '#创建角色'), bd(0, '修炼', '#修炼'), bd(0, '状态', '#状态')],
            [bd(0, '学习技能', '#学习技能'), bd(0, '战斗', '#战斗'), bd(0, '休息', '#休息')],
            [bd(0, 'PVP', '#pvp'), bd(0, '野外探索', '#野外探索'), bd(0, '闭关修炼', '#闭关修炼 1')]
        ])
    }

    async createCharacter(e) {
        return this.cultivation.createPlayer(e)
    }

    async cultivate(e) {
        return this.cultivation.cultivate(e)
    }

    async learnSkill(e) {
        return this.skills.learnSkill(e.user_id, e.msg.split(' ')[1])
    }

    async fight(e) {
        return this.battle.fight(e)
    }

    async status(e) {
        return this.cultivation.getStatus(e)
    }

    async rest(e) {
        return this.cultivation.rest(e)
    }

    async pvp(e) {
        return this.battle.pvp(e)
    }

    async exploreWilderness(e) {
        return this.cultivation.exploreWilderness(e)
    }

    async secludedCultivation(e) {
        return this.cultivation.secludedCultivation(e)
    }
}

function bd(TYPE, label, data) {
    return {
        label,
        ...(TYPE === 0 && { callback: data }),
        ...(TYPE === 1 && { data }),
        ...(TYPE === 2 && { enter: true }),
        ...(TYPE === 3 && { link: data })
    };
}