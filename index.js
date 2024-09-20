import fs from 'node:fs'
import { logger } from 'koishi'
import { Cultivation } from './apps/cultivation.js'
import { Menu } from './apps/menu.js'
import { UPDATE } from './apps/update.js'
import Button from './lain.support.js'

logger.info('修仙插件载入中...')

fs.mkdirSync('plugins/xiuxian-plugin/data', { recursive: true })
const files = fs.readdirSync('./plugins/xiuxian-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
    ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
    let name = files[i].replace('.js', '')

    if (ret[i].status != 'fulfilled') {
        logger.error(`载入插件错误：${logger.red(name)}`)
        logger.error(ret[i].reason)
        continue
    }
    apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export class xiuxian {
    constructor () {
        this.name = '修仙插件'
        this.dsc = '修仙游戏系统'
        this.event = 'message'
        this.priority = 5000
        this.rule = [
            { reg: '^#修仙.*$', fnc: 'dispatch' }
        ]

        this.cultivation = new Cultivation()
        this.menu = new Menu()
        this.update = new UPDATE()
        this.button = new Button()
    }

    async dispatch (e) {
        // 根据命令分发到不同的处理方法
        if (e.msg.includes('帮助') || e.msg.includes('菜单')) {
            return this.menu.dispatch(e)
        }
        if (e.msg.includes('更新')) {
            return this.update.update(e)
        }
        if (e.msg.startsWith('#修仙菜单')) {
            return this.button.showMenu(e)
        }
        // 其他命令的分发逻辑...
        return this.cultivation.dispatch(e)
    }
}

export { apps }
logger.mark('修仙插件载入成功')

// 导出主类
export { xiuxian } from './xiuxian.js'