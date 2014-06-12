var _ = require('lodash');
var irc = require('irc');
var config = require('./botConfig');

module.exports = function irc(sails) {

    return {
        irc:require('irc'),
        bots:{},
        registerBot: function(thisBot){
            var hook = this;
            console.log('Registering bot:',thisBot.name)
            try {
                var botChannels = _.pluck(thisBot.channels,'name');
                console.log(thisBot.name,' will join channels:',botChannels)
                var newBot = new hook.irc.Client(thisBot.host, thisBot.name, {autoConnect: thisBot.autoconnect, autoRejoin: true, channels: botChannels})
            } catch (botCreateError){
                console.log('There was an error creating',thisBot.name,':',botCreateError)
                return {name:thisBot.name,success:false,error:botCreateError};
            }
            hook.bots[thisBot.name] = newBot;


            // Validate and register IRC events

            var validEvents = ['say','error','raw','channellist','registered','motd','names','names#channel','topic','join','join#channel','part','part#channel','quit','kick','kick#channel','kill','message','message#','message#channel','notice','ping','pm','ctcp','ctcp-notice','ctcp-privmsg','ctcp-version','nick','invite','+mode','-mode','whois','channellist_start','channellist_item']

            if (sails.config.irc[thisBot.name] && sails.config.irc[thisBot.name].events){
                var eventsToRegister = sails.config.irc[thisBot.name].events;
            } else {
                console.log('Cant find ircBot logic in "config/irc.js".  Using default event logic.')
                var eventsToRegister = sails.config.irc['defaultBotEvents'].events;
            }

            var userSuppliedEventNames = _.keys(eventsToRegister);
            var possiblyInvalidEvents = _.difference(userSuppliedEventNames, validEvents);

            if (possiblyInvalidEvents.length)
                console.log('These events may not be valid but we will register them anyway:',possiblyInvalidEvents)

            for (var eventName in eventsToRegister){
                console.log('Registering',eventName,'event for',thisBot.name);
                hook.bots[thisBot.name].addListener(eventName,eventsToRegister[eventName]);
            }

            return {name:thisBot.name,success:true};
        },
        signIn: function(message){
            var hook = this;

            console.log('Registering Bots with config ',config)
            var botResults = [];
            Bot.find().populate('channels').exec(function(err,allBots){
                if (err){
                    console.log('There was an error getting the bot config from the DB')
                    return err;
                }

                botResults = botResults.concat(_.each(allBots,hook.registerBot));
                console.log('Bot Registration Results:',botResults)

            })
        },
        defaults: {
            irc: {
                defaultBotEvents:{
                    events:{
                        error:console.log,
                        join:console.log,
                        part:console.log,
                        message:console.log,
                        say:console.log,
                        registered:console.log
                    }
                }

            }
        },
        // Run automatically when the hook initializes
        initialize: function (cb) {

            var hook = this;
            var eventsToWaitFor = [];
            if (sails.hooks.orm) {
                eventsToWaitFor.push('hook:orm:loaded');
            }

            sails.after(eventsToWaitFor, hook.signIn);

            // You must trigger `cb` so sails can continue loading.  If you pass in an error, sails will fail to load, and display your error on the console.
            return cb();
        },
    }
};
