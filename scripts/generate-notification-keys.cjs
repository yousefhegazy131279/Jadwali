// Local generation only. Values are written to an ignored file and never printed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),webpush=require('web-push')
const target=path.resolve('.env.notifications.local')
if(fs.existsSync(target))throw new Error('Refusing to overwrite existing notification keys')
const keys=webpush.generateVAPIDKeys()
fs.writeFileSync(target,[`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`,`VAPID_PRIVATE_KEY=${keys.privateKey}`,'VAPID_SUBJECT=mailto:yousef.hegazy.dev@gmail.com',`CRON_SECRET=${crypto.randomBytes(32).toString('hex')}`,''].join('\n'),{mode:0o600})
console.log('Notification keys written to the ignored local environment file. No secrets were printed.')
