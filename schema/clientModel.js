
import mongoose from 'mongoose';

const clientLogSchema = new mongoose.Schema(
  {
    upaytr:{
type:String,
      required:true,
    },
    ip: {
      type: String,
      required: true,
      trim: true,
      index: true // फ़ास्ट सर्च और फ़िल्टरिंग के लिए
    },
    device: {
      type: {
        type: String,
        default: 'desktop',
        enum: ['desktop', 'mobile', 'tablet', 'smarttv', 'wearable', 'embedded', 'console', 'Unknown']
      },
      brand: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      model: {
        type: String,
        default: 'Unknown',
        trim: true
      }
    },
    os: {
      name: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      version: {
        type: String,
        default: 'Unknown',
        trim: true
      }
    },
    browser: {
      name: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      version: {
        type: String,
        default: 'Unknown',
        trim: true
      }
    },
    location: {
      country: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      region: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      city: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      zip: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      latitude: {
        type: Number,
        default: null
      },
      longitude: {
        type: Number,
        default: null
      },
      timezone: {
        type: String,
        default: 'Unknown',
        trim: true
      },
      isp: {
        type: String,
        default: 'Unknown',
        trim: true
      }
    }
  },
  {
    timestamps: true // यह अपने आप 'createdAt' और 'updatedAt' फील्ड्स ऐड कर देगा
  }
);

// कंपाउंड इंडेक्स: एनालिटिक्स क्वेरीज़ को तेज़ करने के लिए (जैसे किसी खास देश या तारीख के लॉग्स ढूंढना)
clientLogSchema.index({ 'location.country': 1, createdAt: -1 });

const ClientLog = mongoose.models.ClientLog || mongoose.model('ClientLog', clientLogSchema);

export default ClientLog;
