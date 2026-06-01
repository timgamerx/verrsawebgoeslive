// @ts-nocheck
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../components/supabase';
import { 
  IoRocketOutline, 
  IoTrophyOutline, 
  IoPeopleOutline, 
  IoStarOutline,
  IoGiftOutline,
  IoCheckmarkCircle,
  IoSparklesOutline,
  IoChatbubblesOutline,
  IoTrendingUpOutline
} from 'react-icons/io5';

export default function Ambassador() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    socialMedia: '',
    experience: '',
    motivation: '',
    referralSource: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Submit to Supabase
      const { data, error } = await supabase
        .from('ambassador_applications')
        .insert([
          {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            country: formData.country,
            social_media: formData.socialMedia,
            experience: formData.experience,
            motivation: formData.motivation,
            referral_source: formData.referralSource,
            status: 'pending',
            applied_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      setSubmitStatus('success');
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        country: '',
        socialMedia: '',
        experience: '',
        motivation: '',
        referralSource: ''
      });

      // Scroll to success message
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      console.error('Error submitting application:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: <IoGiftOutline className="w-8 h-8" />,
      title: "Premium Subscription",
      description: "Receive 2 months of premium subscription for free, with potential for extension based on performance"
    },
    {
      icon: <IoChatbubblesOutline className="w-8 h-8" />,
      title: "Direct CEO Access",
      description: "Get direct support and have one-on-one conversations with our CEO to share insights and feedback"
    },
    {
      icon: <IoTrophyOutline className="w-8 h-8" />,
      title: "Exclusive Recognition",
      description: "Receive a special Ambassador badge on your profile and be featured in our community spotlight"
    },
    {
      icon: <IoSparklesOutline className="w-8 h-8" />,
      title: "Early Access",
      description: "Be the first to test new features and provide input on product development"
    },
    {
      icon: <IoTrendingUpOutline className="w-8 h-8" />,
      title: "Performance Bonuses",
      description: "Earn additional rewards and incentives based on your referral success and community impact"
    },
    {
      icon: <IoPeopleOutline className="w-8 h-8" />,
      title: "Ambassador Network",
      description: "Join an exclusive community of ambassadors with networking events and collaboration opportunities"
    },
    {
      icon: <IoRocketOutline className="w-8 h-8" />,
      title: "Career Growth",
      description: "Gain valuable experience in community building, marketing, and leadership with official certification"
    },
    {
      icon: <IoStarOutline className="w-8 h-8" />,
      title: "Priority Support",
      description: "Get priority customer support and dedicated resources to help you succeed in your role"
    }
  ];

  return (
    <>
      <Head>
        <title>Verrsa Ambassador Program - Join Our Team</title>
        <meta name="description" content="Join the Verrsa Ambassador Program and help us grow our community while earning exclusive rewards and benefits." />
        <meta property="og:title" content="Verrsa Ambassador Program - Join Our Team" />
        <meta property="og:description" content="Join the Verrsa Ambassador Program and help us grow our community while earning exclusive rewards and benefits." />
        <meta property="og:image" content="https://ik.imagekit.io/verrsa/amb.jpg" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* <h1 className="text-2xl font-bold text-sky-600 cursor-pointer" onClick={() => router.push('/home')}>
                Verrsa
              </h1> */}
               <img src="/verrsa-logo.png" alt="Verrsa" 
              
               style={{width: 120, alignSelf: "self-start"}}
              
               />
              <button
                onClick={() => router.push('/home')}
                className="text-gray-500 hover:text-white font-medium bg-gray-200 hover:bg-gray-700"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 to-sky-400 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <IoSparklesOutline className="w-5 h-5" />
              <span className="text-sm font-medium">Now Accepting Applications</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Become a Verrsa Ambassador
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white max-w-3xl mx-auto">
              Help us grow the Verrsa community and earn exclusive rewards while making a real impact
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <IoCheckmarkCircle className="w-5 h-5" />
                <span>Premium Benefits</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <IoCheckmarkCircle className="w-5 h-5" />
                <span>Direct CEO Access</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <IoCheckmarkCircle className="w-5 h-5" />
                <span>Exclusive Recognition</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        {/* Success/Error Messages */}
        {submitStatus === 'success' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start gap-4">
              <IoCheckmarkCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">Application Submitted Successfully!</h3>
                <p className="text-green-700">
                  Thank you for applying to the Verrsa Ambassador Program. We'll review your application and get back to you within 3-5 business days.
                </p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Submission Failed</h3>
              <p className="text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column - Benefits */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ambassador Benefits
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                As a Verrsa Ambassador, you'll enjoy exclusive perks and opportunities to grow with us
              </p>

              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 text-sky-600">
                        {benefit.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {benefit.title}
                        </h3>
                        <p className="text-gray-600">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* What We're Looking For */}
              <div className="mt-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  What We're Looking For
                </h3>
                <ul className="space-y-3">
                  {[
                    'Passionate about social media and community building',
                    'Active on social platforms with engaged followers',
                    'Excellent communication and networking skills',
                    'Creative mindset with innovative ideas',
                    'Committed to promoting Verrsa authentically',
                    'Enthusiastic about helping others discover Verrsa'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <IoCheckmarkCircle className="w-6 h-6 text-sky-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column - Application Form */}
            <div>
              <div className="bg-white rounded-xl shadow-xl p-8 sticky top-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Apply Now
                </h2>
                <p className="text-gray-600 mb-8">
                  Fill out the form below to join our ambassador program
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                      placeholder="+234 XXX XXX XXXX"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                      placeholder="Enter your country"
                    />
                  </div>

                  {/* Social Media */}
                  <div>
                    <label htmlFor="socialMedia" className="block text-sm font-medium text-gray-700 mb-2">
                      Social Media Handles *
                    </label>
                    <input
                      type="text"
                      id="socialMedia"
                      name="socialMedia"
                      value={formData.socialMedia}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                      placeholder="@username (Twitter, Instagram, etc.)"
                    />
                  </div>

                  {/* Experience */}
                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                      Relevant Experience *
                    </label>
                    <textarea
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition resize-none"
                      placeholder="Tell us about your experience in community building, social media, or marketing..."
                    />
                  </div>

                  {/* Motivation */}
                  <div>
                    <label htmlFor="motivation" className="block text-sm font-medium text-gray-700 mb-2">
                      Why do you want to be a Verrsa Ambassador? *
                    </label>
                    <textarea
                      id="motivation"
                      name="motivation"
                      value={formData.motivation}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition resize-none"
                      placeholder="Share your motivation and what you hope to achieve as an ambassador..."
                    />
                  </div>

                  {/* Referral Source */}
                  <div>
                    <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700 mb-2">
                      How did you hear about this program?
                    </label>
                    <select
                      id="referralSource"
                      name="referralSource"
                      value={formData.referralSource}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    >
                      <option value="">Select an option</option>
                      <option value="social-media">Social Media</option>
                      <option value="friend">Friend/Referral</option>
                      <option value="verrsa-app">Verrsa App</option>
                      <option value="email">Email</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-sky-500 to-sky-400 text-white font-semibold py-4 rounded-lg hover:from-sky-700 hover:to-sky-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Application'
                    )}
                  </button>

                  <p className="text-sm text-gray-500 text-center">
                    By submitting this form, you agree to our terms and conditions
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-gradient-to-r from-sky-500 to-sky-400 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Make an Impact?
            </h2>
            <p className="text-xl text-white mb-8">
              Join our growing community of ambassadors and help shape the future of Verrsa
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-white text-sky-500 font-semibold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
