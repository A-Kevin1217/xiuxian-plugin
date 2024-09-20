import plugin from '../../../lib/plugins/plugin.js'

export class Menu extends plugin {
    constructor() {
        super({
            name: '[XiuXian]菜单',
            dsc: '修仙插件菜单',
            event: 'message',
            priority: 5,
            rule: [
                { reg: /^#修仙帮助$/, fnc: 'showHelp' },
                { reg: /^#修仙菜单$/, fnc: 'showMenu' }
            ]
        })
    }

    async showHelp(e) {
        const helpMessage = `
修仙帮助：

#创建角色 [名字] - 创建一个新的修仙角色
#修炼 - 进行修炼，获得修为和经验
#状态 - 查看角色状态和已学技能
#休息 - 恢复一定的灵力
#使用 [消耗品] - 使用消耗品增加修为或恢复灵力
#学习技能 [技能名] - 学习一项新技能
#技能列表 - 查看可学习的技能列表
#野外探索 - 进行野外探索，随机遇到各种事件
#闭关修炼 [天数] - 进行闭关修炼，获得修为和有小概率突破境界
#修仙帮助 - 显示这个帮助菜单
#修仙菜单 - 显示主菜单
        `
        return e.reply(helpMessage)
    }

    async showMenu(e) {
        const menuMessage = `
修仙系统主菜单：

1. 角色管理
   - 创建角色
   - 查看状态
2. 修炼系统
   - 日常修炼
   - 闭关修炼
3. 技能系统
   - 学习技能
   - 查看技能列表
4. 探索系统
   - 野外探索
5. 帮助信息
   - 修仙帮助

请使用对应的命令进行操作。
        `
        return e.reply(menuMessage)
    }
}