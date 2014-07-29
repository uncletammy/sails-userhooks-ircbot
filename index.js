var _ = require('lodash');
var irc = require('irc');
// var config = require('./botConfig');

module.exports = function irc(sails) {

    return {
        irc:require('irc'),
        bots:{},
        registerBot: function(thisBot){
            var hook = this;
            try {
                var botChannels = thisBot.channels;
                console.log(thisBot.name,' will join channels:',botChannels)
                var newBot = new hook.irc.Client(thisBot.host, thisBot.name, {autoConnect: thisBot.autoconnect, autoRejoin: true, channels: botChannels})
            } catch (botCreateError){
                console.log('There was an error creating',thisBot.name,':',botCreateError)
                return {name:thisBot.name,success:false,error:botCreateError};
            }
            hook.bots[thisBot.name] = newBot;


            // Validate and register IRC events

            var validEvents = ['say','error','raw','channellist','registered','motd','names','names#channel','topic','join','join#channel','part','part#channel','quit','kick','kick#channel','kill','message','message#','message#channel','notice','ping','pm','ctcp','ctcp-notice','ctcp-privmsg','ctcp-version','nick','invite','+mode','-mode','whois','channellist_start','channellist_item']

            if (sails.config.irc.bots[thisBot.name] && sails.config.irc.bots[thisBot.name].events){
                var eventsToRegister = sails.config.irc.bots[thisBot.name].events;
            } else if (thisBot.events){
                var eventsToRegister = thisBot.events;
            } else {
                console.log('Cant find ircBot logic in "config/irc.js".  Using default event logic.')
            }

            var userSuppliedEventNames = _.keys(eventsToRegister);
            var possiblyInvalidEvents = _.difference(userSuppliedEventNames, validEvents);

            if (possiblyInvalidEvents.length)
                console.log('These events may not be valid but we will register them anyway:',possiblyInvalidEvents)

            for (var eventName in eventsToRegister){
                console.log('Registering `',eventName,'` event for',thisBot.name);
                hook.bots[thisBot.name].addListener(eventName,eventsToRegister[eventName]);
            }

            var updateLastSpoke = function(){
                var currentTime = new Date();
                var botName = thisBot.name;
                var correctBot = hook.bots[thisBot.name];
                correctBot.lastSpoke = currentTime;

                // console.log(botName,'last spoke on',currentTime)
            };

            if (thisBot.autokick){

                hook.bots[thisBot.name].lastSpoke = new Date();

                var doKickWatch = function(){
                    var currentTime = new Date();
                    var correctBot = hook.bots[thisBot.name];
                    var botName = thisBot.name;
                    var getLastSpoke = correctBot.lastSpoke;
                    var timeDifference = currentTime-correctBot.lastSpoke;

                    if (timeDifference >= correctBot.autokick){
                        console.log('kicking',botName,'due to inactivity');
                        hook.signOutBot(correctBot)
                    }

                    // console.log(botName,'last spoke',timeDifference,'miliseconds ago');
                };

                hook.bots[thisBot.name].autokick = thisBot.autokick;
                hook.bots[thisBot.name].kickWatchIntervalID = setInterval(doKickWatch,20*1000);
                hook.bots[thisBot.name].addListener('selfMessage',updateLastSpoke);
            }

            return {name:thisBot.name,success:true};
        },
        spawnNewBot: function(botObject){
            var hook = this;
            try {
                hook.registerBot(botObject)
                return true;
            } catch (botRegError){
                console.log('Error registering bot:',botRegError);
                return false;
            }
        },
        signOutBot: function(botToDisconnect){
            var hook = this;
            console.log('shutting down interval id:',botToDisconnect.kickWatchIntervalID);
            clearInterval(botToDisconnect.kickWatchIntervalID);
            var oldBotCount = Object.keys(hook.bots).length;
            botToDisconnect.disconnect();
            // console.log('Deleting bot',botToDisconnect.nick)
            // delete hook.bots[botToDisconnect.nick];
            console.log('There were',oldBotCount,'. Now there are',Object.keys(hook.bots).length);
        },
        signInBots: function(message){
            var hook = this;

            // console.log('Registering Bots with config ',config)
            var botResults = [];

            if (sails.models['bot']){
                Bot.find().populate('channels').exec(function(err,allModelBots){
                    if (err){
                        console.log('There was an error getting the bot config from the DB')
                        return err;
                    }

                    botResults = botResults.concat(_.each(allModelBots,hook.registerBot));

                })
            } else if (sails.config.irc.bots){
                // Check for bots in irc.js config file;
                var allTheBots = sails.config.irc.bots;

                _.each(allTheBots,function(oneBot){

                    var botObject = {
                        name: oneBot.config.name,
                        autoconnect: oneBot.config.autoconnect,
                        autorejoin: oneBot.config.autorejoin,
                        host: oneBot.config.host,
                        channels: oneBot.config.channels,
                        events: oneBot.events,
                        autokick: oneBot.autokick
                    }

                    console.log('Found Bot:',botObject)
                    botResults.push(hook.registerBot(botObject));

                })

            } else {
                console.log('No bots to be found')
            }



            console.log('Bot Registration Results:',botResults)
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

            sails.after(eventsToWaitFor, hook.signInBots);

            // You must trigger `cb` so sails can continue loading.  If you pass in an error, sails will fail to load, and display your error on the console.
            return cb();
        }
    }
};
