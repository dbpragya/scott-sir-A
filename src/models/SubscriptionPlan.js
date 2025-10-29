const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
  },
  price: { 
    type: Number, 
    required: true,
    min: 0,
  },
  currency: { 
    type: String, 
    default: 'USD',
    uppercase: true,
    trim: true,
  },
  duration: { 
    type: String, 
    required: true, 
    enum: ['day', 'week', 'month', 'year','lifetime'],
  },
  eventLimit: {
    type: Number,
    default: null, // null = unlimited, 3 = limit to 3 events
  },
  description: { 
    type: String, 
    trim: true,
  },
  features: [{ 
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

SubscriptionPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
