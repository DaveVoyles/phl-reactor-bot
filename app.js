const builder     = require('botbuilder' );
const restify     = require('restify'    );
const request     = require('request'    );
const querystring = require('querystring');
                    require('dotenv'     ).config(); 

// Create chat bot
// These values come from https://apps.dev.microsoft.com/#/appList  
var connector = new builder.ChatConnector({
    appId:       process.env.APP_ID,
    appPassword: process.env.APP_PASS
});

// Instance of bot which connects via our App ID & Password 
const bot             = new builder.UniversalBot(connector);

// Pull this ID from the URL located here: https://qnamaker.ai/Home/MyServices
const knowledgeBaseID = "0951de94-9705-49ec-b68a-6be0b6eadbda";

// Setup restify server for use
const server = restify.createServer()
      server.listen(process.env.port || process.env.PORT || 3978, function () {
        console.log('%s listening to %s', server.name, server.url); 
      })
      server.post('/api/messages', connector.listen());

      // Serve the embded HTML chat bot on our index.html page. Users will interact w/ the bot there.
      // Look in the public folder and grab the index.html page
      server.get(/\/?.*/, restify.serveStatic({
        directory: './public',
        default:   'index.html'
      }));


// Dialogues
//***************************************************

  // Root directory, all bot dialogues begin here.
  bot.dialog('/', [
    function (session) {
        session.beginDialog('/initGreeting');
    },
      // Only called if user asks "hi" or "hello" a second time
    // Send user's response to the server
    (session, response) => {
        // call QnA Maker endpoint (our FAQ)
        pingQnAService(response.response, (err, result) => {
          if (err) {
            console.error(err);
            session.send('Unfortunately an error occurred:' + err + '. ' + 'Try again.')
          } else {
            // parse answer from Q&A maker, which is our pre-defined FAQ, and draw it to the screen
            session.send(JSON.parse(result).answer);
            builder.Prompts.text(session, 'Have any more questions?');    
          }
        })
    }
  ]);
      

  // First greeting the user sees
  bot.dialog("/initGreeting",[
    function (session) {
      builder.Prompts.text(session, "Hello, do you have any questions about the Reactor? \r"
                                   + "You can ask me about hardware, hours, address, events, etc.");
    },
    // After user has asked their first question, this function is called.
    // Send user's response to the server
    (session, response) => {
        // call QnA Maker endpoint (our FAQ)
        pingQnAService(response.response, (err, result) => {
          if (err) {
            console.error(err);
            session.send('Unfortunately an error occurred:' + err + '. ' + 'Try again.')
          } else {
            // parse answer from Q&A maker, which is our pre-defined FAQ, and draw it to the screen
            session.send(JSON.parse(result).answer);
            builder.Prompts.text(session, 'Have any more questions?');
          }
        })
    }
  ]);


/**
 * @param {string}    q - Query that user has for FAQ bot 
 * @param {function} cb - Function to be called after all is executed, typically handles errors
 */
const pingQnAService = (q, cb) => {
  // Here's where we pass anything the user typed along to the QnA service.
  q = querystring.escape(q);

  request('http://qnaservice.cloudapp.net/KBService.svc/GetAnswer?kbId=' + knowledgeBaseID + '&question=' + q, 
  function (error, response, body) {
      if (error) {
        console.error("error in response from qna server:" + error);
        cb(error, null);
      } else if (response.statusCode !== 200) {
        // Valid response from QnA but it's an error
        // return the response for further processing
        console.log("response.statusCode !== 200:" + response);
        cb("response.statusCode !== 200:"  + response, null);
      } else {
        // All looks OK, the answer is in the body
        console.log("Response from qna is good: " + body);
        cb(null, body);
      }
  })
}
