const mongoose = require('mongoose');
const SubscriptionPlan = require('./src/models/SubscriptionPlan');

const atlasUri = 'mongodb+srv://dbradhikaraghuvanshi:DfXRulB6s0O15VZ7@makeithappen.vqlsbsi.mongodb.net/make-it-happen?retryWrites=true&w=majority&appName=MakeItHappen';

mongoose.connect(atlasUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB Atlas');

    const existingPlan = await SubscriptionPlan.findOne();
    if (existingPlan) {
      console.log('Plan already exists in DB');
      mongoose.disconnect();
      return;
    }

    const plan = new SubscriptionPlan({
      price: 120,
      currency: 'USD',
      duration: 'year',
      name: 'Ultimate Yearly Plan',
      description: 'For Complete transformation.',
      features: [
        'Customized Invitations & Themes',
        'Color customizations',
        'Themed event pages',
        'Ad-Free Experience.',
      ],
    });

    await plan.save();
    console.log('Plan saved successfully');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB Atlas:', err);
    mongoose.disconnect();
  });
