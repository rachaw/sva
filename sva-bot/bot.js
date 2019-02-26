// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes } = require('botbuilder');
const { DialogSet, NumberPrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const { SlotFillingDialog } = require('./slotFillingDialog');
const { SlotDetails } = require('./slotDetails');

const DIALOG_STATE_PROPERTY = 'dialogState';

const USER_VERIFIED = 'N';
const USER_STATE_MSG_1 = 'We have found that you have an incomplete order in our system. Would you like to complete it now?. (Y/N)';

const USER_STATE_MSG_2 = 'You already added *Star value pack*, *Sony value pack* to your order. Would you like to add more packs?';

const USER_STATE_MSG_3 = 'Okay. Please tell me what would you like me to do? 1) Know your balance, 2) Help. Please enter (1/2)';

const USER_STATE_MSG_4 = 'You may choose from these packs 1) Disney-Kids, 2) News 24, 3) NDTV News, 4) National Geographic Channel, 5) Discovery Channel. Type more to see complete list...';

const USER_RES_SEL_MSG_1 = 'You have added *Star value pack*, *Sony value pack*, *Disney-Kids* and *NDTV News*. Your montly rental would be Rs. 402. Would you like to confirm this order?';

const USER_RES_SEL_MSG_2 = 'Your order is confirmed. Your new pack will be activated in 4-8 hours. Thank you for being a valuable customer.';

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

        // Set up a series of questions for collecting and verifying user.
        const userCredentialSlots = [
            new SlotDetails('msisdn', 'msisdn', 'Please enter your mobile number registered with us.', 'The mobile number you have entered does not seems to be valid. Pls enter correctly.'),
            new SlotDetails('vcode', 'vcode', 'We have sent an a verification code on your mobile. Please enter')
        ];

        const validatedUserQueryWithPendingOrderSlots = [
            new SlotDetails('checkPendingOrder', 'checkPendingOrder', 'Thank you for validating your verification code.'+USER_STATE_MSG_1, 'Please answer in Y/N')
            // new SlotDetails('reviewSelection', 'reviewSelection', 'We have sent an a verification code on your mobile. Please enter', 'Verification code is invalid. Pls enter valid code.')
        ];

        // const validatedUserQueryWithOutPendingOrderSlots = [
        //     new SlotDetails('checkPendingOrder', 'checkPendingOrder', 'Thank you for validating your verification code.'+USER_STATE_MSG_1, 'Please answer in Y/N')
        //     // new SlotDetails('vcode', 'vcode', 'We have sent an a verification code on your mobile. Please enter', 'Verification code is invalid. Pls enter valid code.')
        // ];

        // Set up a series of questions to collect a street address.
        const addressSlots = [
            new SlotDetails('street', 'text', 'Please enter your street address.'),
            new SlotDetails('city', 'text', 'Please enter the city.'),
            new SlotDetails('zip', 'text', 'Please enter your zipcode.')
        ];

        
        // Link the questions together into a parent group that contains references
        // to both the fullname and address questions defined above.
        //Ramit - This defines the sequence of questions to be thrown by bot. 
        //Ramit - 2nd argument defines the prompt id which must exist in the DialogSet i.e. 'dialogs' defined below
        const slots = [
            new SlotDetails('userCredential', 'userCredential'),
            new SlotDetails('checkPendingOrder', 'checkPendingOrder', 'Thank you for validating your verification code.'+USER_STATE_MSG_1, 'Please answer in Y/N'),
            // new SlotDetails('validatedUserQueryWithPendingOrder', 'validatedUserQueryWithPendingOrder'),
            new SlotDetails('confirmPrevOrder','confirmPrevOrder', USER_STATE_MSG_2),
            new SlotDetails('addMorePacks','addMorePacks', USER_STATE_MSG_4),
            new SlotDetails('updatePendingOrder','updatePendingOrder', USER_RES_SEL_MSG_1)
        ];

        // const verifiedUserSlot = [
        //     // new SlotDetails('userCredential', 'userCredential'),
        //     new SlotDetails('validatedUserQueryWithPendingOrder', 'validatedUserQueryWithPendingOrder'),
        //     // new SlotDetails('shoesize', 'shoesize', 'Please enter your shoe size.', 'You must enter a size between 0 and 16. Half sizes are acceptable.'),
        //     // new SlotDetails('address', 'address')
        // ];

        const continueOrderSlot = [
            new SlotDetails('confirmPrevOrder','confirmPrevOrder', USER_STATE_MSG_2)
        ];

        const ignoreOrderSlot = [
            new SlotDetails('otherHelp','otherHelp', USER_STATE_MSG_3)
        ];


        // Add the individual child dialogs and prompts used.
        // Note that the built-in prompts work hand-in-hand with our custom SlotFillingDialog class
        // because they are both based on the provided Dialog class.
        this.dialogs.add(new SlotFillingDialog('address', addressSlots));

        this.dialogs.add(new SlotFillingDialog('userCredential', userCredentialSlots));
        this.dialogs.add(new NumberPrompt('msisdn', this.msisdnValidator));
        this.dialogs.add(new NumberPrompt('vcode', this.vcodeValidator));

        this.dialogs.add(new SlotFillingDialog('validatedUserQueryWithPendingOrder', validatedUserQueryWithPendingOrderSlots));
        this.dialogs.add(new TextPrompt('checkPendingOrder', this.pendingOrderValidator));
        this.dialogs.add(new TextPrompt('confirmPrevOrder'));
        this.dialogs.add(new TextPrompt('updatePendingOrder', this.updatePendingOrderValidator));
        this.dialogs.add(new TextPrompt('text'));
        this.dialogs.add(new TextPrompt('number'));

        this.dialogs.add(new NumberPrompt('shoesize', this.shoeSizeValidator));

        this.dialogs.add(new SlotFillingDialog('slot-dialog', slots));


        // this.dialogs.add(new TextPrompt('confirmPrevOrder', this.responseValidator));
        // this.dialogs.add(new TextPrompt('confirmPrevOrder', this.optionValidator));
        

        this.dialogs.add(new TextPrompt('addMorePacks'));
        this.dialogs.add(new TextPrompt('otherHelp'));
        
        
        this.dialogs.add(new SlotFillingDialog('continueOrderSlot-dialog', continueOrderSlot));
        this.dialogs.add(new SlotFillingDialog('ignoreOrderSlot-dialog', ignoreOrderSlot));

        // Finally, add a 2-step WaterfallDialog that will initiate the SlotFillingDialog,
        // and then collect and display the results.
        // this.dialogs.add(new WaterfallDialog('root', [
        //     this.startDialog.bind(this)
        //     // this.startDialog1.bind(this),
        //     // this.startDialog2.bind(this)
        // //    this.processResults.bind(this)
        // ]));

        this.dialogs.add(new WaterfallDialog('root', [
            this.startDialog.bind(this)
            // this.startDialog1.bind(this),
            // this.startDialog2.bind(this)
        //    this.processResults.bind(this)
        ]));

    }

    // This is the first step of the WaterfallDialog.
    // It kicks off the dialog with the multi-question SlotFillingDialog,
    // then passes the aggregated results on to the next step.
    async startDialog(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('slot-dialog');
        // if (USER_VERIFIED === 'Y') {
            
        // } 
        // if (USER_VERIFIED === 'N') {
            
        // }

    }

    async startDialog3(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('validatedUserQueryWithPendingOrder');    
    }


    async startDialog1(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('continueOrderSlot-dialog');    
    }

    async startDialog2(step) {
        // return await step.beginDialog('slot-dialog');
        return await step.beginDialog('ignoreOrderSlot-dialog');
    }

    // This is the second step of the WaterfallDialog.
    // It receives the results of the SlotFillingDialog and displays them.
    async processResults(step) {
        // Each "slot" in the SlotFillingDialog is represented by a field in step.result.values.
        // The complex that contain subfields have their own .values field containing the sub-values.
        const values = step.result.values;

        const userCredential = values['userCredential'].values;
        await step.context.sendActivity(`Your name is ${ userCredential['msisdn'] } ${ userCredential['vcode'] }.`);

        // await step.context.sendActivity(`You wear a size ${ values['shoesize'] } shoes.`);

        // const address = values['address'].values;
        // await step.context.sendActivity(`Your address is: ${ address['street'] }, ${ address['city'] } ${ address['zip'] }`);

        return await step.endDialog();
    }

    async updatePendingOrderValidator(prompt) {
        if (prompt.recognized.succeeded) {
            const userResponse = prompt.recognized.value;

            // user response should be either Y or N
            if (userResponse === 'Y'){
                prompt.context.sendActivity(USER_RES_SEL_MSG_2);
                return true;
            } else if (userResponse === 'N') {
                prompt.context.sendActivity('Your packs have not changes as your order is still in pending state. You will continue watching the current packs with the existing monthly rental');
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
                //RAMIT-TODO - Set the actual order details received from context
                prompt.context.sendActivity(this.USER_STATE_MSG_2);
                return true;
            } else if (userResponse === 'N') {

                prompt.context.sendActivity(this.USER_STATE_MSG_3);
                //RAMIT-TODO replace with standard menu dialog
                return true;

            } else  {

                return false;
            }
        }

        return false;
    }

    // Validate that the provided shoe size is between 0 and 16, and allow half steps.
    // This is used to instantiate a specialized NumberPrompt.
    async shoeSizeValidator(prompt) {
        if (prompt.recognized.succeeded) {
            const shoesize = prompt.recognized.value;

            // Shoe sizes can range from 0 to 16.
            if (shoesize >= 0 && shoesize <= 16) {
                // We only accept round numbers or half sizes.
                if (Math.floor(shoesize) === shoesize || Math.floor(shoesize * 2) === shoesize * 2) {
                    // Indicate success.
                    return true;
                }
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
                prompt.context.sendActivity('Verification code is invalid. Pls enter valid code.');
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
            // Otherwise, repeat this dialog, passing in the list from this iteration.
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
