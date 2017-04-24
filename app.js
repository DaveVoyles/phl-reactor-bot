const builder     = require('botbuilder' );
const restify     = require('restify'    );
const request     = require('request'    );
const querystring = require('querystring');
                    require('dotenv'     ).config(); 

// Create chat bot
// These come from https://apps.dev.microsoft.com/#/appList  
var connector = new builder.ChatConnector({
    appId:       process.env.APP_ID,
    appPassword: process.env.APP_PASS
});
 
const bot = new builder.UniversalBot(connector);

// Request
// Pull this ID from the URL located here: https://qnamaker.ai/Home/MyServices
const knowledgeBaseID = "0951de94-9705-49ec-b68a-6be0b6eadbda";

// bot setup for restify server
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

bot.dialog('/', [
  // TODO: Add additonal prompts here
  (session, response) => {
        builder.Prompts.text(session, 'Have any questions about the Microsoft Reactor?');
  },

  // Send response to the server
  (session, response) => {
    // call QnA Maker endpoint
    pingQnAService(response.response, (err, result) => {
      if (err) {
        console.error(err);
        session.send('Unfortunately an error occurred. Try again.')
      } else {
                    // The QnA returns a JSON: { answer:XXXX, score: XXXX: }
                    // where score is a confidence the answer matches the question.
                    // Advanced implementations might log lower scored questions and
                    // answers since they tend to indicate either gaps in the FAQ content
                    // or a model that needs training

        // parse answer from Q&A maker
        session.send(JSON.parse(result).answer)
        // Displays question to the screen
        builder.Prompts.confirm(session, 'Do you have any more questions about the Reactor? (Yes or No)');
      }
    })
  },
  (session, response) => {
    if (response.response) {
        // user has another question
      session.endDialog()
      return
    }
    session.send('Okay great!')
    session.endDialog()
  }
])


// Helper functions
const pingQnAService = (q, cb) => {
  // Here's where we pass anything the user typed along to the QnA service.
  q = querystring.escape(q);

  request('http://qnaservice.cloudapp.net/KBService.svc/GetAnswer?kbId=' + knowledgeBaseID + '&question=' + q, 
  function (error, response, body) {
      if (error) {
        cb(error, null);
      } else if (response.statusCode !== 200) {
              // Valid response from QnA but it's an error
              // return the response for further processing
        cb(response, null);
      } else {
              // All looks OK, the answer is in the body
        cb(null, body);
      }
  })
}
