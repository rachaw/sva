// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes } = require('botbuilder');
const { DialogSet, NumberPrompt, TextPrompt, WaterfallDialog, ChoicePrompt } = require('botbuilder-dialogs');

const { SlotFillingDialog } = require('./slotFillingDialog');
const { SlotDetails } = require('./slotDetails');

const DIALOG_STATE_PROPERTY = 'dialogState';
const http =require('http');

const USER_VERIFIED = 'N';
const DONE_OPTION = 'done';
const INCOMPLETE_ORDER_MSG = 'Thank you for validating your verification code. We have found that you have an incomplete order in our system. Would you like to complete it now?. (Y/N)';

PREVIOUS_ORDER_CHANNELS = '';

var CHANNELS_SELECTED = [];

var CHANNEL_OPTIONS = ['Star Sports Value','Sony Ten Value','Discovery', 'Disney-Kids'];

var THANK_YOU_MSG = `Thank you for being a valuable customer. In case you would like to know more information type 'more'`;

//RAMIT-TODO - Set this value at runtime basis the user context saved in database.
SHOW_PREV_ORDER_DETAILS_MSG = '';

const OTHER_MENU_OPTIONS = 'Okay. Please tell me what would you like me to do? 1) Know your balance, 2) Help. Please enter (1/2)';

const ADD_MORE_PACKS = 'You may choose from these packs 1) Disney-Kids, 2) News 24, 3) NDTV News, 4) National Geographic Channel, 5) Discovery Channel. Type more to see complete list...';

const SEEK_FINAL_CONFIRMATION_WITH_CHG = 'Your montly rental would be Rs. 402. Would you like to confirm this order?';
// SEEK_FINAL_CONFIRMATION_WITH_CHG = 'You have added *Star value pack*, *Sony value pack*, *Disney-Kids* and *NDTV News*. Your montly rental would be Rs. 402. Would you like to confirm this order?';

//RAMIT-TODO - Read value from the input and append these in the message below.
const SEEK_FINAL_CONFIRMATION_NO_CHANGE = 'Your monthly rental would be Rs.325 . Would you like to confirm this order?';

const SHOW_ORDER_SUCCESS_CONFIRMATION_MSG = 'Your order is confirmed. Your new pack will be activated in 4-8 hours.';

const SHOW_ORDER_INCOMPLETE_MSG = 'Your packs have not changes as your order is still in pending state. You will continue watching the current packs with the existing monthly rental';

showChannelOptions = [];
var channelOptions = [];

// channelOptions = ['A','B','C','D','E','F'];

class SampleBot {
    /**
     * SampleBot defines the core business logic of this bot.
     * @param {ConversationState} conversationState A ConversationState object used to store dialog state.
     */
    constructor(conversationState) {
        this.conversationState = conversationState;

        // Create a property used to store dialog state.
        // See https://aka.ms/about-bot-state-accessors to learn more about bot state and state accessors.
        this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);

        // Create a dialog set to include the dialogs used by this bot.
        this.dialogs = new DialogSet(this.dialogState);
        
        //Ramit - TODO - load this value from the user context stored in CosmosDB
        var previousOrderChannel = '*Star value pack*, *Sony value pack*';

        SHOW_PREV_ORDER_DETAILS_MSG = 'You already added '+ previousOrderChannel + ' to your order. Would you like to add more packs?';





        // Set up a series of questions for collecting and verifying user.
        const userCredentialSlots = [
            new SlotDetails('msisdn', 'msisdn', 'Please enter your mobile number registered with us.', 'The mobile number you have entered does not seems to be valid. Pls enter correctly.'),
            new SlotDetails('vcode', 'vcode', 'We have sent an a verification code on your mobile. Please enter', 'Verification code is invalid. Pls enter valid code.')
        ];

        const checkIfPendingOrderSlot = [
            new SlotDetails('checkPendingOrder', 'checkPendingOrder', INCOMPLETE_ORDER_MSG, 'Please answer in Y/N'),
        ];        

        const reviewPrevOrderSlot = [
            new SlotDetails('showPrevOrderDetails','showPrevOrderDetails', SHOW_PREV_ORDER_DETAILS_MSG), 
        ];

        var addMorePackSlot = [
            // new SlotDetails('addPacks','addPacks', ADD_MORE_PACKS, 'Sorry Please choose a pack/channel from the list', ['Redmond', 'Bellevue', 'Seattle']),
            new SlotDetails('addPacks','addPacks', ADD_MORE_PACKS, 'Sorry Please choose a pack/channel from the list'),            
        ];    

        const changePrevOrderSlot = [
            new SlotDetails('confirmChangePrevOrder','confirmChangePrevOrder', SEEK_FINAL_CONFIRMATION_WITH_CHG, 'Please answer in Y/N'),
            new SlotDetails('thankYouMsg','thankYouMsg',THANK_YOU_MSG)
        ];

        const noChangePrevOrderSlot = [
            new SlotDetails('confirmChangePrevOrder','confirmChangePrevOrder', SEEK_FINAL_CONFIRMATION_NO_CHANGE, 'Please answer in Y/N'),
            new SlotDetails('thankYouMsg','thankYouMsg',THANK_YOU_MSG)
        ];
        
        // Link the questions together into a parent group that contains references
        // to both the fullname and address questions defined above.
        //Ramit - This defines the sequence of questions to be thrown by bot. 
        //Ramit - 2nd argument defines the prompt id which must exist in the DialogSet i.e. 'dialogs' defined below
        const slots = [
            new SlotDetails('userCredential', 'userCredential'),
        ];

        const otherMenuSlots = [
            new SlotDetails('otherHelp', 'otherHelp', OTHER_MENU_OPTIONS),
        ]

        const confirmPendingOrderNoChangeSlots = [
            new SlotDetails('pendingOrderNoChange', 'pendingOrderNoChange', SEEK_FINAL_CONFIRMATION_NO_CHANGE),
        ]

        // Add the individual child dialogs and prompts used.
        // Note that the built-in prompts work hand-in-hand with our custom SlotFillingDialog class
        // because they are both based on the provided Dialog class.

        this.dialogs.add(new SlotFillingDialog('slot-dialog', slots));

        this.dialogs.add(new SlotFillingDialog('userCredential', userCredentialSlots));
        this.dialogs.add(new NumberPrompt('msisdn', this.msisdnValidator));
        this.dialogs.add(new NumberPrompt('vcode', this.vcodeValidator));

        this.dialogs.add(new TextPrompt('checkPendingOrder', this.pendingOrderValidator));
        
        this.dialogs.add(new SlotFillingDialog('checkIfPendingOrder', checkIfPendingOrderSlot));
        
        this.dialogs.add(new SlotFillingDialog('reviewPrevOrder', reviewPrevOrderSlot));

        this.dialogs.add(new SlotFillingDialog('addMorePack', addMorePackSlot));

        this.dialogs.add(new SlotFillingDialog('changePrevOrder', changePrevOrderSlot));
        
        this.dialogs.add(new SlotFillingDialog('noChangePrevOrder', noChangePrevOrderSlot));
        
        this.dialogs.add(new TextPrompt('showPrevOrderDetails'), this.incompleteOrderConfirmation);
        this.dialogs.add(new ChoicePrompt('addPacks'));

        this.dialogs.add(new TextPrompt('confirmChangePrevOrder', this.confirmChangeOrderValidator));
        // this.dialogs.add(new TextPrompt('confirmNoChangePrevOrder', this.confirmNoChangeOrderValidator));

        this.dialogs.add(new TextPrompt('text'));
        this.dialogs.add(new TextPrompt('number'));
        this.dialogs.add(new ChoicePrompt('choices'));
        
        this.dialogs.add(new SlotFillingDialog('otherMenu', otherMenuSlots));
        this.dialogs.add(new TextPrompt('otherHelp'));

        this.dialogs.add(new SlotFillingDialog('confirmPendingOrderNoChange', confirmPendingOrderNoChangeSlots));
        this.dialogs.add(new TextPrompt('pendingOrderNoChange'));

        this.dialogs.add(new TextPrompt('thankYouMsg'));
        
        
        // this.dialogs.add(new SlotFillingDialog('continueOrderSlot-dialog', continueOrderSlot));
        // this.dialogs.add(new SlotFillingDialog('ignoreOrderSlot-dialog', ignoreOrderSlot));

        // Finally, add a 2-step WaterfallDialog that will initiate the SlotFillingDialog,
        // and then collect and display the results.
        this.dialogs.add(new WaterfallDialog('root', [
            this.startDialog.bind(this),
            this.checkPendingOrder.bind(this),
            this.processResults.bind(this)
        ]));


        this.dialogs.add(new WaterfallDialog('otherMenuDialog', [
            this.otherMenuDialog.bind(this)
        ]));

        this.dialogs.add(new WaterfallDialog('reviewPrevOrderDialog', [
            this.reviewPrevOrderDialog.bind(this),
            this.processReview.bind(this)
        ]));

        this.dialogs.add(new WaterfallDialog('addMorePackDialog', [
            this.addMorePackDialog.bind(this),
            this.loopStep.bind(this)
        ]));

        this.dialogs.add(new WaterfallDialog('confirmPrevOrderDialog', [
            this.confirmPrevOrderDialog.bind(this)
        ]));

        this.dialogs.add(new WaterfallDialog('changePrevOrderDialog', [
            this.changePrevOrderDialog.bind(this)
        ]));

    }


    async changePrevOrderDialog(step) {

        const list = Array.isArray(step.options) ? step.options : [];
    
        step.values[SEEK_FINAL_CONFIRMATION_WITH_CHG]  = list.join(', ');
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('changePrevOrder');
    }

    async confirmPrevOrderDialog(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('noChangePrevOrder');
    }

    async reviewPrevOrderDialog(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('reviewPrevOrder');
    }

    async addMorePackDialog(step) {


            // Continue using the same selection list, if any, from the previous iteration of this dialog.
        const list = Array.isArray(step.options) ? step.options : [];

        step.values[CHANNELS_SELECTED] = list;

        // Create a prompt message.
        let message;
        if (list.length === 0) {
            message = 'Please choose pack/channel to add, or `' + DONE_OPTION + '` to finish.';
        } else {
            message = 'You have selected **' + list.join(', ') + '** channels. You can add more channels, ' +
                'or choose `' + DONE_OPTION + '` to finish.';
        }

        // Create the list of options to choose from.
        const options = list.length > 0
            ? CHANNEL_OPTIONS.filter(function (item) { return item !== list.find(function(element) {
                return element === item;
              }) })
        // ? CHANNEL_OPTIONS.filter(function (item) { return item !== list[0] })
            : CHANNEL_OPTIONS.slice()
        options.push(DONE_OPTION);

        // step.showChannelOptions = options;

        return await step.prompt('addPacks', {
            prompt: message,
            retryPrompt: 'Please choose an option from the list.',
            choices: options
        });

        // return await step.beginDialog('slot-dialog');
        // return await step.beginDialog('addMorePack');
    }

    async loopStep(step) {
        // Retrieve their selection list, the choice they made, and whether they chose to finish.
        const list = step.values[CHANNELS_SELECTED];
        const choice = step.result;
        const done = choice.value === DONE_OPTION;
    
        if (!done) {
            // If they chose a company, add it to the list.
            list.push(choice.value);
        }
    
        if (done) {
            // If they're done, exit and return their list.
            // return await step.endDialog(list);
            return await step.beginDialog('changePrevOrderDialog',list);
        } else {
            // Otherwise, repeat this dialog, passing in the list fralog, passing in the list from this iteration.
            return await step.replaceDialog('addMorePackDialog', list);
        }
    }

    async otherMenuDialog(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('otherMenu');
    }


    // This is the first step of the WaterfallDialog.
    // It kicks off the dialog with the multi-question SlotFillingDialog,
    // then passes the aggregated results on to the next step.
    async startDialog(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('userCredential');
    }

    async checkPendingOrder(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('checkIfPendingOrder');
    }

    // This is the first step of the WaterfallDialog.
    // It kicks off the dialog with the multi-question SlotFillingDialog,
    // then passes the aggregated results on to the next step.
    async startDialog1(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('confirmPendingOrderNoChange');

    }

    // This is the second step of the WaterfallDialog.
    // It receives the results of the SlotFillingDialog and displays them.
    async processResults(step) {
        // Each "slot" in the SlotFillingDialog is represented by a field in step.result.values.
        // The complex that contain subfields have their own .values field containing the sub-values.
        const values = step.result.values;

        const isChangeRequired = values['checkPendingOrder'];

        // await step.context.sendActivity('You have a pending order ' + isChangeRequired);

        if (isChangeRequired === 'Y') {
            return await step.beginDialog('reviewPrevOrderDialog');
        } else {
            return await step.beginDialog('otherMenuDialog');
        }
        

        // await step.context.sendActivity(`You wear a size ${ values['shoesize'] } shoes.`);

        // const address = values['address'].values;
        // await step.context.sendActivity(`Your address is: ${ address['street'] }, ${ address['city'] } ${ address['zip'] }`);
        // return await step.endDialog();
    }

    async processReview(step) {
        // Each "slot" in the SlotFillingDialog is represented by a field in step.result.values.
        // The complex that contain subfields have their own .values field containing the sub-values.
        const values = step.result.values;

        const isChangeRequired = values['showPrevOrderDetails'];

        // await step.context.sendActivity('You have chosen to change previous order ' + isChangeRequired);

        if (isChangeRequired === 'Y') {
            return await step.beginDialog('addMorePackDialog');
        } else {
            return await step.beginDialog('confirmPrevOrderDialog');
        }
        

        // await step.context.sendActivity(`You wear a size ${ values['shoesize'] } shoes.`);

        // const address = values['address'].values;
        // await step.context.sendActivity(`Your address is: ${ address['street'] }, ${ address['city'] } ${ address['zip'] }`);
        // return await step.endDialog();
    }

    

    async incompleteOrderConfirmation(prompt) {
        if (prompt.recognized.succeeded) {
            const userResponse = prompt.recognized.value;

            // user response should be either Y or N
            if (userResponse === 'Y'){
                // prompt.context.sendActivity(ADD_MORE_PACKS);
                return true;
            } else if (userResponse === 'N') {
                //RAMIT-TODO - Replace dialog here to go to final confirmation with no change
                prompt.context.sendActivity(SEEK_FINAL_CONFIRMATION_NO_CHANGE);
                // return await prompt.context.beginDialog('newroot');
                return true;

            } else  {

                return false;
            }
        }

        return false;
    }

    async confirmChangeOrderValidator(prompt) {
        if (prompt.recognized.succeeded) {
            const userResponse = prompt.recognized.value;
            const thanks = THANK_YOU_MSG;

            // user response should be either Y or N
            if (userResponse === 'Y'){
                prompt.context.sendActivity(SHOW_ORDER_SUCCESS_CONFIRMATION_MSG);
                return true;
            } else if (userResponse === 'N') {
                prompt.context.sendActivity(SHOW_ORDER_INCOMPLETE_MSG);
                return true;

            } else  {

                return false;
            }
        }

        return false;
    }

    async confirmNoChangeOrderValidator(prompt) {
        if (prompt.recognized.succeeded) {
            const userResponse = prompt.recognized.value;
            const thanks = THANK_YOU_MSG;

            // user response should be either Y or N
            if (userResponse === 'Y'){
                prompt.context.sendActivity(SHOW_ORDER_SUCCESS_CONFIRMATION_MSG);
                return true;
            } else if (userResponse === 'N') {
                prompt.context.sendActivity(SHOW_ORDER_INCOMPLETE_MSG);
                return true;

            } else  {

                return false;
            }
        }

        return false;
    }

    //Check if user has entered only Y/N in the response
    async pendingOrderValidator(prompt) {
        if (prompt.recognized.succeeded) {
            const userResponse = prompt.recognized.value;

            // user response should be either Y or N
            if (userResponse === 'Y'){
                return true;
            } else if (userResponse === 'N') {

                //RAMIT-TODO replace with standard menu dialog
                return true;


            } else  {

                return false;
            }
        }

        return false;
    }

    async msisdnValidator(prompt) {
        if (prompt.recognized.succeeded) {
            const msisdn = prompt.recognized.value;
            //console.log("msisdn" +msisdn);
            var phoneno = /^\d{10}$/;
            if((msisdn.toString().match(phoneno))){
                //RAMIT - TODO - Invoke API for sending verification code.
            	/*var options={
            		//	host: '10.5.203.124',
            		 //   port: '3128',
            			path:'http://ibmsmsservice.azurewebsites.net/jsp/sendsms.jsp?msisdn='+msisdn,
            			method:'GET'
            		};*/
            	var options={
            			host: 'ibmsmsservice.azurewebsites.net',
            		    port: '80',
            			path:'/jsp/sendsms.jsp?msisdn='+msisdn,
            			method:'GET'
            		};
            	http.request(options,function(res){
            		var body='';
            		//console.log(res);
            		res.on('data',function(chunk){
            			body+=chunk;
            		});
            		res.on('end',function(){
            			console.log("Rest response " +body);
            			
            		});
            		
            		
            	}).end();
            	 return true;
               
            }
            else {
                return false;
            }
        }
        return false;
    }


    async vcodeValidator(prompt) {
        if (prompt.recognized.succeeded) {
            const vcode = prompt.recognized.value;
            console.log("---vcode "+vcode);
            var otp=['10250','67543','85489','20618','15432'];
            var phoneno = /^\d{6}$/;
            console.log(otp.indexOf(vcode));
            if(otp.indexOf(vcode.toString())!=-1){
            	console.log("User verified");
                //RAMIT-TODO - Invoke API for validating verification code. If verified, return true. Else prompt error message and return false.
                this.USER_VERIFIED = 'Y';
                return true;
            }
            else {
            	console.log("User not verified");
                this.USER_VERIFIED = 'N';
                return false;
            }
        }
        return false;
    }

    // async startSelectionStep(step) {
    //     // Set the user's age to what they entered in response to the age prompt.
    //     step.values[USER_INFO].age = step.result;
    
    //     if (step.result < 25) {
    //         // If they are too young, skip the review-selection dialog, and pass an empty list to the next step.
    //         await step.context.sendActivity('You must be 25 or older to participate.');
    //         return await step.next([]);
    //     } else {
    //         // Otherwise, start the review-selection dialog.
    //         return await step.beginDialog(REVIEW_SELECTION_DIALOG);
    //     }
    // }
    
    // async acknowledgementStep(step) {
    //     // Set the user's company selection to what they entered in the review-selection dialog.
    //     const list = step.result || [];
    //     step.values[USER_INFO].companiesToReview = list;
    
    //     // Thank them for participating.
    //     await step.context.sendActivity(`Thanks for participating, ${step.values[USER_INFO].name}.`);
    
    //     // Exit the dialog, returning the collected user information.
    //     return await step.endDialog(step.values[USER_INFO]);
    // }

    // Review selection
    // async selectionStep(step) {
    //     // Continue using the same selection list, if any, from the previous iteration of this dialog.
    //     const list = Array.isArray(step.options) ? step.options : [];
    //     step.values[CHANNELS_SELECTED] = list;
    
    //     // Create a prompt message.
    //     let message;
    //     if (list.length === 0) {
    //         message = 'Please choose a company to review, or `' + DONE_OPTION + '` to finish.';
    //     } else {
    //         message = `You have selected **${list[0]}**. You can review an addition company, ` +
    //             'or choose `' + DONE_OPTION + '` to finish.';
    //     }
    
    //     // Create the list of options to choose from.
    //     const options = list.length > 0
    //         ? CHANNEL_OPTIONS.filter(function (item) { return item !== list[0] })
    //         : CHANNEL_OPTIONS.slice();
    //     options.push(DONE_OPTION);
    
    //     // Prompt the user for a choice.
    //     return await step.prompt(SELECTION_PROMPT, {
    //         prompt: message,
    //         retryPrompt: 'Please choose an option from the list.',
    //         choices: options
    //     });
    // }
    


    /**
     *
     * @param {TurnContext} turnContext A TurnContext object representing an incoming message to be handled by the bot.
     */
    async onTurn(turnContext) {
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Create dialog context.
            const dc = await this.dialogs.createContext(turnContext);

            const utterance = (turnContext.activity.text || '').trim().toLowerCase();
            if (utterance === 'cancel') {
                if (dc.activeDialog) {
                    await dc.cancelAllDialogs();
                    await dc.context.sendActivity(`Ok... canceled.`);
                } else {
                    await dc.context.sendActivity(`Nothing to cancel.`);
                }
            }

            if (utterance === 'more') {
                if (dc.activeDialog) {
                    await dc.beginDialog('otherMenuDialog');
                }
            }

            if (!dc.context.responded) {
                // Continue the current dialog if one is pending.
                await dc.continueDialog();
            }

            if (!dc.context.responded) {
                // If no response has been sent, start the onboarding dialog.
                await dc.beginDialog('root');
            }

        } else if (
            turnContext.activity.type === ActivityTypes.ConversationUpdate &&
             turnContext.activity.membersAdded[0].name !== 'Bot'
        ) {
            // Send a "this is what the bot does" message.
            const description = [
                'This is a bot that demonstrates an alternate dialog system',
                'which is a virtual assistant for SHAARP TV Company..',
                'Say anything to continue.'
            ];
            await turnContext.sendActivity(description.join(' '));
        }

        await this.conversationState.saveChanges(turnContext);
    }
}

module.exports.SampleBot = SampleBot;
