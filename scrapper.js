const commander = require('commander')
const chalk = require('chalk');
const ora = require('ora');
const Spinner = ora({color: 'yellow'});
const {prompt} = require('enquirer');
console.clear()
console.log(`
                  ╔═╗  ╦═╗  ╔═╗  ╦ ╦  ╦    ╔═╗  ╦═╗
                  ║    ╠╦╝  ╠═╣  ║║║  ║    ║╣   ╠╦╝
                  ╚═╝  ╩╚═  ╩ ╩  ╚╩╝  ╩═╝  ╚═╝  ╩╚═
`)
async function Main(){
    let res = await prompt({
        type: 'input',
        name: 'url',
        message: 'Please give me a url to start scanning'
    })
    if(!res.url) return Main()
    const url = res.url;
    const fetch = require('node-fetch')
        const fs = require('fs')
        const puppeteer = require('puppeteer')
        const path = require('path')
        const foldername = Date.now()
        if (!fs.existsSync(commander.dir || `./${foldername}`)) {
            fs.mkdirSync(commander.dir || `./${foldername}`)
        }
        const width = 400
        const height = 900
        const options = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                `--window-size=${width},${height}`,
            ]
        }
        const browser = await puppeteer.launch(options)
        try {
            const page = (await browser.pages())[0] || await browser.newPage()

            const pageDown = async () => {
                const scrollHeight = 'document.body.scrollHeight';
                let previousHeight = await page.evaluate(scrollHeight);
                await page.evaluate(`window.scrollTo(0, ${scrollHeight})`);
                await page.waitForFunction(`${scrollHeight} > ${previousHeight}`, {
                    timeout: 30000
                })
            }
            Spinner.start(`Crawling is now scanning ${url}...`)
            await page.goto(url)
            const getPages = () => page.evaluate(() => window.document.querySelectorAll('[data-test-id=pinGrid]')[0].querySelectorAll('img[src]').length)
            let prev = await getPages()
            while (true) {
                await pageDown()
                const pages = await getPages()
                Spinner.text = `Crawler found ${pages} pages with images`
                if(pages >= 100){
                    break;
                }
                if (prev === pages) {
                    break
                }

                prev = pages
            }
            const urls = await page.evaluate(() => Array.from(window.document.querySelectorAll('[data-test-id=pinGrid]')[0].querySelectorAll('img[src]').values()).map(r=>r.getAttribute('src')))
            Spinner.succeed(`Crawler has found ${urls.length} urls to download`)
            await Promise.all(urls.map(r=>{
                return fetch(r).then(res => new Promise((resolve, reject) => {
                    const stream = fs.createWriteStream(path.join(commander.dir || `./${foldername}/`, r.split('/').pop()))
                    res.body.pipe(stream)
                    res.body.on('error', err => {
                        console.log(`Crawler failed to download ${r}`)
                        stream.close()
                        reject(err)
                    })
                    stream.on('finish', () => {
                        stream.close()
                        console.log(chalk.green(`Crawler downloaded ${r}`))
                        resolve()
                    })
                }).catch(e => console.error(e.message)))
            }))
        } catch (e) {
        } finally {
            await browser.close()
            try {
                let res = await prompt({
                    type: 'password',
                    name: 'webhook',
                    message: 'Which webhook would you like the images to be sent?'
                })
                const fs = require('fs');
                const Discord = require('discord.js');
                res.webhook = res.webhook.replace(/https:\/\/discord\.com\/api\/webhooks\//g, '').replace(/https:\/\/canary\.discord\.com\/api\/webhooks\//g, '');
                const Webhook = res.webhook.split('/')
                const webhook = new Discord.WebhookClient(Webhook[0], Webhook[1])
                webhook.edit('Crawler', 'https://i.imgur.com/wird51W.jpg')
                let counter = 0;
                let queue = 0;
                fs.readdir(`${foldername}/`, (e, files) => {
                    console.log(`Preparing to send ${files.length} files to webhook`)
                    files.forEach((f) => {
                        counter += 1;
                        setTimeout(() => {
                            queue += 1;
                            const Embed = new Discord.RichEmbed()
                            .attachFile(new Discord.Attachment(`${foldername}/${f}`, f))
                            .setImage(`attachment://${f}`)
                            .setColor('#0d0d0d')
                            .setAuthor('𝙰𝙻𝙾𝙽𝙴 𝙸𝙽 𝚃𝙾𝙺𝚈𝙾')
                            .setFooter(`𝙲𝚛𝚊𝚠𝚕𝚎𝚛 𝙱𝚢 𝙺.𝚈.𝚂`)
                            webhook.send(Embed).then(() => {
                                console.log(`[${queue}]: ${f} was sent succesfully`)
                                fs.unlinkSync(`${foldername}/${f}`)
                            }).catch(e => console.log(`[${queue}]: ${f} could not be sent "${e.message}"`))
                        }, counter * 2500);
                    })
                })
            } catch (e) {
                return process.exit(1)
            }
        }
}
Main()