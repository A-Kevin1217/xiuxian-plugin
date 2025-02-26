import lodash from 'lodash'
import { createRequire } from 'module'
import { Restart } from '../../other/restart.js'
import plugin from '../../../lib/plugins/plugin.js'

const require = createRequire(import.meta.url)
const { exec, execSync } = require('child_process')

let uping = false

/** 插件名称 */
const PLUGIN_NAME = 'xiuxian-plugin'

export class UPDATE extends plugin {
    constructor() {
        super({
            name: '[XiuXian]更新',
            dsc: '修仙插件更新',
            event: 'message',
            priority: 1,
            rule: [
                { reg: /^#修仙(强制)?更新$/, fnc: 'update' }
            ]
        })
    }

    async update(e) {
        if (!e.isMaster) return e.reply('只有主人才能执行更新操作')

        if (uping) return e.reply('已有更新命令执行中..请勿重复操作')

        if (!await this.checkGit()) return
        await this.runUpdate()
        if (this.isUp) {
            setTimeout(() => this.restart(), 2000)
        }
    }

    restart() {
        new Restart(this.e).restart()
    }

    async checkGit() {
        let ret = await execSync('git --version', { encoding: 'utf-8' })
        if (!ret || !ret.includes('git version')) {
            await this.reply('请先安装git')
            return false
        }
        return true
    }

    async runUpdate() {
        let cm = `git -C ./plugins/${PLUGIN_NAME}/ pull --no-rebase`
        let type = '更新'
        if (this.e.msg.includes('强制')) {
            type = '强制更新'
            cm = `git -C ./plugins/${PLUGIN_NAME}/ checkout . && ${cm}`
        }
        this.oldCommitId = await this.getcommitId()
        await this.reply(`开始执行${type}操作...`)
        uping = true
        let ret = await this.execSync(cm)
        uping = false
        if (ret.error) {
            logger.mark(`${this.e.logFnc} 更新失败：${PLUGIN_NAME}`)
            this.gitErr(ret.error, ret.stdout)
            return false
        }
        let time = await this.getTime()
        if (/Already up|已经是最新/g.test(ret.stdout)) {
            await this.reply(`${PLUGIN_NAME}已经是最新\n最后更新时间：${time}`)
        } else {
            await this.reply(`${PLUGIN_NAME}更新成功\n更新时间：${time}`)
            this.isUp = true
            let log = await this.getLog()
            await this.reply(log)
        }
        logger.mark(`${this.e.logFnc} 最后更新时间：${time}`)
        return true
    }

    async getcommitId() {
        let cm = `git -C ./plugins/${PLUGIN_NAME}/ rev-parse --short HEAD`
        let commitId = await execSync(cm, { encoding: 'utf-8' })
        commitId = lodash.trim(commitId)
        return commitId
    }

    async getTime() {
        let cm = `cd ./plugins/${PLUGIN_NAME}/ && git log -1 --oneline --pretty=format:"%cd" --date=format:"%m-%d %H:%M"`
        let time = ''
        try {
            time = await execSync(cm, { encoding: 'utf-8' })
            time = lodash.trim(time)
        } catch (error) {
            logger.error(error.toString())
            time = '获取时间失败'
        }
        return time
    }

    async execSync(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
                resolve({ error, stdout, stderr })
            })
        })
    }

    async getLog() {
        let cm = `cd ./plugins/${PLUGIN_NAME}/ && git log  -20 --oneline --pretty=format:"%h||[%cd]  %s" --date=format:"%m-%d %H:%M"`
        let logAll
        try {
            logAll = await execSync(cm, { encoding: 'utf-8' })
        } catch (error) {
            logger.error(error.toString())
            this.reply(error.toString())
        }
        if (!logAll) return false
        logAll = logAll.split('\n')
        let log = []
        for (let str of logAll) {
            str = str.split('||')
            if (str[0] == this.oldCommitId) break
            if (str[1].includes('Merge branch')) continue
            log.push(str[1])
        }
        let line = log.length
        log = log.join('\n\n')
        if (log.length <= 0) return ''
        log = await this.makeForwardMsg(`${PLUGIN_NAME}更新日志，共${line}条`, log)
        return log
    }

    async makeForwardMsg(title, msg, end) {
        let nickname = Bot.nickname
        if (this.e.isGroup) {
            let info = await Bot.getGroupMemberInfo(this.e.group_id, Bot.uin)
            nickname = info.card || info.nickname
        }
        let userInfo = {
            user_id: Bot.uin,
            nickname
        }

        let forwardMsg = [
            {
                ...userInfo,
                message: title
            },
            {
                ...userInfo,
                message: msg
            }
        ]

        if (end) {
            forwardMsg.push({
                ...userInfo,
                message: end
            })
        }

        /** 制作转发内容 */
        if (this.e.isGroup) {
            forwardMsg = await this.e.group.makeForwardMsg(forwardMsg)
        } else {
            forwardMsg = await this.e.friend.makeForwardMsg(forwardMsg)
        }

        return forwardMsg
    }

    async gitErr(err, stdout) {
        let msg = '更新失败！'
        let errMsg = err.toString()
        stdout = stdout.toString()
        if (errMsg.includes('Timed out')) {
            let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
            await this.reply(msg + `\n连接超时：${remote}`)
            return
        }
        if (/Failed to connect|unable to access/g.test(errMsg)) {
            let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
            await this.reply(msg + `\n连接失败：${remote}`)
            return
        }
        if (errMsg.includes('be overwritten by merge')) {
            await this.reply(msg + `存在冲突：\n${errMsg}\n` + '请解决冲突后再更新，或者执行#修仙强制更新，放弃本地修改')
            return
        }
        if (stdout.includes('CONFLICT')) {
            await this.reply([msg + '存在冲突\n', errMsg, stdout, '\n请解决冲突后再更新，或者执行#修仙强制更新，放弃本地修改'])
            return
        }
        await this.reply([errMsg, stdout])
    }
}