// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes } = require('botbuilder');
const { DialogSet, NumberPrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const { SlotFillingDialog } = require('./slotFillingDialog');
const { SlotDetails } = require('./slotDetails');

const DIALOG_STATE_PROPERTY = 'dialogState';

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
            new SlotDetails('vcode', 'vcode', 'We have sent an a verification code on your mobile. Please enter', 'Verification code is invalid. Pls enter valid code.')
        ];

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
            // new SlotDetails('age', 'age', 'Please enter your age.', 'You must enter age more than 10'),
            // new SlotDetails('shoesize', 'shoesize', 'Please enter your shoe size.', 'You must enter a size between 0 and 16. Half sizes are acceptable.'),
            // new SlotDetails('address', 'address')
        ];



        // Add the individual child dialogs and prompts used.
        // Note that the built-in prompts work hand-in-hand with our custom SlotFillingDialog class
        // because they are both based on the provided Dialog class.
        this.dialogs.add(new SlotFillingDialog('address', addressSlots));
        this.dialogs.add(new SlotFillingDialog('userCredential', userCredentialSlots));
        this.dialogs.add(new TextPrompt('text'));
        this.dialogs.add(new TextPrompt('number'));
        this.dialogs.add(new NumberPrompt('msisdn', this.msisdnValidator));
        this.dialogs.add(new NumberPrompt('vcode', this.vcodeValidator));
        this.dialogs.add(new NumberPrompt('shoesize', this.shoeSizeValidator));
        this.dialogs.add(new SlotFillingDialog('slot-dialog', slots));

        // Finally, add a 2-step WaterfallDialog that will initiate the SlotFillingDialog,
        // and then collect and display the results.
        this.dialogs.add(new WaterfallDialog('root', [
            this.startDialog.bind(this),
            this.processResults.bind(this)
        ]));
    }

    // This is the first step of the WaterfallDialog.
    // It kicks off the dialog with the multi-question SlotFillingDialog,
    // then passes the aggregated results on to the next step.
    async startDialog(step) {
        return await step.beginDialog('slot-dialog');
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
                //RAMIT - TODO - Invoke API for validating verification code. If verified, return true.
                return true;
            }
            else {
                return false;
            }
        }
        return false;
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
