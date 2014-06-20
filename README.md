# sails-hooks-irc
### Description
An IRC Bot user hook for the Sails.js framework (~v0.10).

### Installation

##### via npm
`npm install sails-userhooks-ircbot`

### Setting Up A Bot
##### Create The Hook
Create the file `myApp/hooks/ircbot/index.js`

```javascript

module.exports = require('sails-userhooks-ircbot');

```

##### Add A Config File
Create the file `myApp/config/irc.js`

```javascript

module.exports.irc = {
	"sailsTroll": {
		events:{
			error:console.log,
			join:console.log,
			part:console.log,
			message:console.log,
			say:console.log,
			registered:console.log
		}
	} 
};


```

##### Generate a 'bot' `api`

```sh

dude@littleDude:~/node/myApp$ sails generate api bot

debug: Generated a new controller `file` at api/controllers/BotController.js!
debug: Generated a new model `File` at api/models/Bot.js!

info: REST API generated @ http://localhost:1337/Bot
info: and will be available the next time you run `sails lift`.

dude@littleDude:~/node/myApp$ 

```

##### Add a `bot` model instance

Either lift your app in [console](http://beta.sailsjs.org/#/documentation/reference/Command-Line/sailsconsole.html) or [use blueprints](http://beta.sailsjs.org/#/documentation/reference/Blueprints) to create a record like this in it that looks like this.

``` javascript

  {
    "name" : "sailsTroll"
    "host" : "chat.freenode.net",
    "autoconnect" : true,
    "autorejoin" : true
  }


```


##### Lift Your App
Your Bot should connect after the hook registers.

### Events

See [node-irc documentation](http://node-irc.readthedocs.org/en/latest/API.html#events)

### TODO
- Create a generator to automatically create config/hook files
- Allow bots to be defined in `irc.js` as well as in a waterline collection

