const mongoose = require('mongoose');
const SubscriptionPlan = require('./src/models/SubscriptionPlan');

const atlasUri = 'mongodb+srv://dbradhikaraghuvanshi:DfXRulB6s0O15VZ7@makeithappen.vqlsbsi.mongodb.net/make-it-happen?retryWrites=true&w=majority&appName=MakeItHappen'; // <-- Add your MongoDB Atlas URI here

mongoose.connect(atlasUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB Atlas');

    const existingPlans = await SubscriptionPlan.find();
    if (existingPlans.length > 0) {
      console.log('Plans already exist in DB');
      await mongoose.disconnect();
      return;
    }

    const plans = [
      {
        price: 10,
        currency: 'USD',
        duration: 'month',
        name: '+3 Events Plans',
        description: 'Extra Event Creation.',
        features: [
          'Now you can create 3 more events in your account'
        ],
      },
      {
        price: 80,
        currency: 'USD',  
        duration: 'month',
        name: 'Ultimate Yearly Plan',
        description: 'For complete transformation.',
        features: [
          'Customized invitations & themes',
          'Color customizations',
          'Themed event pages',
          'Ad-Free Experience.',
        ],
      },
      {
        price: 120,
        currency: 'USD',
        duration: 'year',
        name: 'Ultimate Yearly Plan',
        description: 'For complete transformation.',
        features: [
          'Customized invitations & themes',
          'Color customizations',
          'Themed event pages',
          'Ad-Free Experience.',
        ],
      },
    ];

    await SubscriptionPlan.insertMany(plans);
    console.log('3 plans inserted successfully!');
    await mongoose.disconnect();
  })
  .catch(async (err) => {
    console.error('Error connecting to MongoDB Atlas:', err);
    await mongoose.disconnect();
  });