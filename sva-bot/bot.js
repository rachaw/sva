// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes } = require('botbuilder');
const { DialogSet, NumberPrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const { SlotFillingDialog } = require('./slotFillingDialog');
const { SlotDetails } = require('./slotDetails');

const DIALOG_STATE_PROPERTY = 'dialogState';

const USER_VERIFIED = 'N';
const INCOMPLETE_ORDER_MSG = 'Thank you for validating your verification code. We have found that you have an incomplete order in our system. Would you like to complete it now?. (Y/N)';

PREVIOUS_ORDER_CHANNELS = '';

var THANK_YOU_MSG = `Thank you for being a valuable customer. In case you would like to know more information type 'more'`;

//RAMIT-TODO - Set this value at runtime basis the user context saved in database.
SHOW_PREV_ORDER_DETAILS_MSG = '';

const OTHER_MENU_OPTIONS = 'Okay. Please tell me what would you like me to do? 1) Know your balance, 2) Help. Please enter (1/2)';

const ADD_MORE_PACKS = 'You may choose from these packs 1) Disney-Kids, 2) News 24, 3) NDTV News, 4) National Geographic Channel, 5) Discovery Channel. Type more to see complete list...';

//RAMIT-TODO - Read value from the input and append these in the message below.
var SEEK_FINAL_CONFIRMATION_WITH_CHG = 'You have added *Star value pack*, *Sony value pack*, *Disney-Kids* and *NDTV News*. Your montly rental would be Rs. 402. Would you like to confirm this order?';

//RAMIT-TODO - Read value from the input and append these in the message below.
var SEEK_FINAL_CONFIRMATION_NO_CHANGE = 'You have *Star value pack* and *Sony value pack* from your previous. Your monthly rental would be Rs.325 . Would you like to confirm this order?';

const SHOW_ORDER_SUCCESS_CONFIRMATION_MSG = 'Your order is confirmed. Your new pack will be activated in 4-8 hours.';

const SHOW_ORDER_INCOMPLETE_MSG = 'Your packs have not changes as your order is still in pending state. You will continue watching the current packs with the existing monthly rental';

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

        //RAMIT - TODO - load this value from the user context stored in CosmosDB
        SHOW_PREV_ORDER_DETAILS_MSG = 'You already added *Star value pack*, *Sony value pack* to your order. Would you like to add more packs?';

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

        const changePrevOrderSlot = [
            new SlotDetails('addMorePacks','addMorePacks', ADD_MORE_PACKS),
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

        this.dialogs.add(new SlotFillingDialog('changePrevOrder', changePrevOrderSlot));
        
        this.dialogs.add(new SlotFillingDialog('noChangePrevOrder', noChangePrevOrderSlot));
        
        this.dialogs.add(new TextPrompt('showPrevOrderDetails'), this.incompleteOrderConfirmation);
        this.dialogs.add(new TextPrompt('addMorePacks'));

        this.dialogs.add(new TextPrompt('confirmChangePrevOrder', this.confirmChangeOrderValidator));
        // this.dialogs.add(new TextPrompt('confirmNoChangePrevOrder', this.confirmNoChangeOrderValidator));

        this.dialogs.add(new TextPrompt('text'));
        this.dialogs.add(new TextPrompt('number'));
        
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

        this.dialogs.add(new WaterfallDialog('confirmPrevOrderDialog', [
            this.confirmPrevOrderDialog.bind(this)
        ]));

        this.dialogs.add(new WaterfallDialog('changePrevOrderDialog', [
            this.changePrevOrderDialog.bind(this)
        ]));

    }


    async changePrevOrderDialog(step) {
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

        await step.context.sendActivity('You have a pending order ' + isChangeRequired);

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

        await step.context.sendActivity('You have chosen to change previous order ' + isChangeRequired);

        if (isChangeRequired === 'Y') {
            return await step.beginDialog('changePrevOrderDialog');
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

            var phoneno = /^\d{10}$/;
            if((msisdn.toString().match(phoneno))){
                //RAMIT - TODO - Invoke API for sending verification code.
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

            var phoneno = /^\d{6}$/;
            if((vcode.toString().match(phoneno))){

                //RAMIT-TODO - Invoke API for validating verification code. If verified, return true. Else prompt error message and return false.
                this.USER_VERIFIED = 'Y';
                return true;
            }
            else {
                this.USER_VERIFIED = 'N';
                return false;
            }
        }
        return false;
    }

    async startSelectionStep(stepContext) {
        // Set the user's age to what they entered in response to the age prompt.
        stepContext.values[USER_INFO].age = stepContext.result;
    
        if (stepContext.result < 25) {
            // If they are too young, skip the review-selection dialog, and pass an empty list to the next step.
            await stepContext.context.sendActivity('You must be 25 or older to participate.');
            return await stepContext.next([]);
        } else {
            // Otherwise, start the review-selection dialog.
            return await stepContext.beginDialog(REVIEW_SELECTION_DIALOG);
        }
    }
    
    async acknowledgementStep(stepContext) {
        // Set the user's company selection to what they entered in the review-selection dialog.
        const list = stepContext.result || [];
        stepContext.values[USER_INFO].companiesToReview = list;
    
        // Thank them for participating.
        await stepContext.context.sendActivity(`Thanks for participating, ${stepContext.values[USER_INFO].name}.`);
    
        // Exit the dialog, returning the collected user information.
        return await stepContext.endDialog(stepContext.values[USER_INFO]);
    }

    // Review selection
    async selectionStep(stepContext) {
        // Continue using the same selection list, if any, from the previous iteration of this dialog.
        const list = Array.isArray(stepContext.options) ? stepContext.options : [];
        stepContext.values[COMPANIES_SELECTED] = list;
    
        // Create a prompt message.
        let message;
        if (list.length === 0) {
            message = 'Please choose a company to review, or `' + DONE_OPTION + '` to finish.';
        } else {
            message = `You have selected **${list[0]}**. You can review an addition company, ` +
                'or choose `' + DONE_OPTION + '` to finish.';
        }
    
        // Create the list of options to choose from.
        const options = list.length > 0
            ? COMPANY_OPTIONS.filter(function (item) { return item !== list[0] })
            : COMPANY_OPTIONS.slice();
        options.push(DONE_OPTION);
    
        // Prompt the user for a choice.
        return await stepContext.prompt(SELECTION_PROMPT, {
            prompt: message,
            retryPrompt: 'Please choose an option from the list.',
            choices: options
        });
    }
    
    async loopStep(stepContext) {
        // Retrieve their selection list, the choice they made, and whether they chose to finish.
        const list = stepContext.values[COMPANIES_SELECTED];
        const choice = stepContext.result;
        const done = choice.value === DONE_OPTION;
    
        if (!done) {
            // If they chose a company, add it to the list.
            list.push(choice.value);
        }
    
        if (done || list.length > 1) {
            // If they're done, exit and return their list.
            return await stepContext.endDialog(list);
        } else {
            // Otherwise, repeat this dialog, passing in the list fralog, passing in the list from this iteration.
            return await stepContext.replaceDialog(REVIEW_SELECTION_DIALOG, list);
        }
    }

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
                'which uses a slot filling technique to collect multiple responses from a user.',
                'Say anything to continue.'
            ];
            await turnContext.sendActivity(description.join(' '));
        }

        await this.conversationState.saveChanges(turnContext);
    }
}

module.exports.SampleBot = SampleBot;
