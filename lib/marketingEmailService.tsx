import { createClient } from "@supabase/supabase-js";
import { emailService, EmailTemplate } from "./emailService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // Service role key needed to access auth.users
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Marketing email templates based on the 10 copies provided
export const marketingTemplates = {
// 1. Welcome & Onboarding
welcomeOnboarding: (username: string, email: string): EmailTemplate => ({
to: email,
subject: "Welcome to Verrsa – Your Journey Starts Here! 🎉",
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #f9f9f9;
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #00bfff;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }

    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1
    
      >Welcome to Verrsa, ${username}! 🎉</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>We're thrilled to have you join Verrsa – the platform where creators connect, share, and thrive!</p>

      <h3>Here's what you can do to get started:</h3>
      <ul>
        <li>✅ <strong>Complete your profile</strong> – Add a bio, profile picture, and showcase your personality.</li>
        <li>✅ <strong>Follow communities</strong> – Discover and join communities that match your interests.</li>
        <li>✅ <strong>Share your first post</strong> – Let the world know what you're all about!</li>
        <li>✅ <strong>Engage with others</strong> – Comment, like, and connect with fellow creators.</li>
      </ul>

      <p>Need help? Check out our <a href="https://verrsa.org">Quick Start Guide</a> or reach out to our support team
        anytime.</p>

      <a href="https://verrsa.org" class="button"
      style="background-color: #00bfff;"
      >Explore Verrsa Now</a>

      <p>Here's to an amazing journey ahead! 🚀</p>

       <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>

  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>

      <p>The Verrsa Team</p>
    </div>
    <div class="footer">
      © 2025 Verrsa. All rights reserved.<br>
      <a href="https://verrsa.org/unsubscribe">Unsubscribe</a>
    </div>
  </div>
</body>

</html>
`,
textContent: `Welcome to Verrsa, ${username}!\n\nWe're thrilled to have you join Verrsa – the platform where creators
connect, share, and thrive!\n\nHere's what you can do to get started:\n• Complete your profile\n• Follow communities\n•
Share your first post\n• Engage with others\n\nExplore Verrsa: https://verrsa.org\n\nThe Verrsa Team`,
}),

// 2. Feature Announcement
featureAnnouncement: (
username: string,
email: string,
featureName: string,
): EmailTemplate => ({
to: email,
subject: `🚀 New Update: ${featureName} is Here!`,
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: #34c1f9;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1>🚀 Exciting News, ${username}!</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>We've just launched <strong>${featureName}</strong> – a game-changer for your Verrsa experience!</p>

      <h3>What's New:</h3>
      <p>${featureName} allows you to take your content and connections to the next level with enhanced tools and
        features designed just for you.</p>

      <h3>Why You'll Love It:</h3>
      <ul>
        <li>✨ More creative control</li>
        <li>✨ Better engagement with your audience</li>
        <li>✨ Seamless integration with existing features</li>
      </ul>

      <a href="https://verrsa.org" class="button"
      style="background-color: #00bfff;"
      >Try ${featureName} Now</a>

      <p>Have feedback? We'd love to hear from you!</p>

       <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>

  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>

      <p>The Verrsa Team</p>
    </div>
  </div>
</body>

</html>
`,
textContent: `Exciting News, ${username}!\n\nWe've just launched ${featureName} – a game-changer for your Verrsa
experience!\n\nTry it now: https://verrsa.org\n\nThe Verrsa Team`,
}),

// 3. Re-engagement Campaign
reengagement: (username: string, email: string): EmailTemplate => ({
to: email,
subject: "We Miss You on Verrsa! 💙",
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: #764ba2;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #764ba2;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1>We Miss You, ${username}! 💙</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>It's been a while since we've seen you on Verrsa, and we wanted to check in!</p>

      <h3>Here's What You've Been Missing:</h3>
      <ul>
        <li>🔥 Exciting new posts from creators you follow</li>
        <li>🎯 Communities buzzing with activity</li>
        <li>✨ New features to help you connect and create</li>
      </ul>

      <p>Your community is waiting for you – come back and pick up where you left off!</p>

      <a href="https://verrsa.org" class="button"
        style="background-color: #00bfff;"
      >Welcome Back to Verrsa</a>

      <p>We'd love to have you back!</p>
      <p>The Verrsa Team</p>

    <div style="display: inline-block; margin-top: 10px;">
      <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px;" />

      <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
        <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
         style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
      </a>
    </div>

    <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
    <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
      You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
    </p>

    </div>
  </div>
</body>

</html>
`,
textContent: `We Miss You, ${username}!\n\nIt's been a while since we've seen you on Verrsa. Your community is waiting
for you!\n\nCome back: https://verrsa.org\n\nThe Verrsa Team`,
}),

// 4. Premium/Subscription Upgrade
premiumUpgrade: (username: string, email: string): EmailTemplate => ({
to: email,
subject: "Unlock Verrsa Premium – Exclusive Benefits Await! 🌟",
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #f5576c;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }

    .benefits {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1>Upgrade to Verrsa Premium 🌟</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>Ready to take your Verrsa experience to the next level?</p>

      <div class="benefits">
        <h3>Premium Benefits:</h3>
        <ul>
          <li>⚡ Ad-free browsing</li>
          <li>🎨 Exclusive themes and customization</li>
          <li>💎 Priority support</li>
          <li>📊 Advanced analytics for your content</li>
          <li>✨ Early access to new features</li>
          <li>🏆 Premium badge on your profile</li>
        </ul>
      </div>

      <p><strong>Special Offer:</strong> Get 20% off your first month when you upgrade today!</p>

      <a href="https://verrsa.org/VerrsaSubscription" class="button"
      style="background-color: #00bfff;"
      >Upgrade Now</a>

      <p>Join thousands of creators who've already upgraded!</p>


   
  <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>


  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>
      <p>The Verrsa Team</p>
    </div>
  </div>
</body>

</html>
`,
textContent: `Upgrade to Verrsa Premium, ${username}!\n\nPremium Benefits:\n• Ad-free browsing\n• Exclusive themes\n•
Priority support\n• Advanced analytics\n• Early access to features\n• Premium badge\n\nSpecial Offer: 20% off first
month!\n\nUpgrade: https://verrsa.org/VerrsaSubscription\n\nThe Verrsa Team`,
}),

// 5. Content Tips & Best Practices
contentTips: (username: string, email: string): EmailTemplate => ({
to: email,
subject: "6 Tips to Boost Your Engagement on Verrsa 📈",
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: #667eea;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }

    .tip {
      background: #f0f4ff;
      padding: 15px;
      border-left: 4px solid #00bfff;
      margin: 15px 0;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1>Grow Your Presence on Verrsa 📈</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>Want to boost your engagement and reach more people? Here are 6 proven tips:</p>

      <div class="tip"
      >
        <h4>1. Post Consistently</h4>
        <p>Regular posting keeps your audience engaged. Aim for at least 3-5 posts per week.</p>
      </div>

      <div class="tip">
        <h4>2. Use Eye-Catching Visuals</h4>
        <p>Posts with images or videos get 3x more engagement than text-only posts.</p>
      </div>

      <div class="tip">
        <h4>3. Engage with Your Community</h4>
        <p>Reply to comments, join conversations, and support other creators.</p>
      </div>

      <div class="tip">
        <h4>4. Leverage Hashtags</h4>
        <p>Use relevant hashtags to help people discover your content.</p>
      </div>

      <div class="tip">
        <h4>5. Go Live</h4>
        <p>Live streams create real-time connections and boost your visibility.</p>
      </div>

      <div class="tip">
        <h4>6. Share a Verse</h4>
        <p>Got a quick thought? Drop a <strong>Verse</strong> – share up to 280 characters with an optional image, and let your personality shine in real time. Verses appear directly in the home feed with full likes, comments, shares, and bookmarks, giving you instant visibility with zero effort. Tap the <strong>"+"</strong> button to post your first Verse now!</p>
      </div>

      <p>Start implementing these tips today and watch your engagement soar!</p>
      <p>The Verrsa Team</p>

      <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; margin-bottom: 20px;text-decoration: underline; cursor: pointer;">www.verrsa.org</a>
    </div>
  </div>

  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>
</body>

</html>
`,
textContent: `Grow Your Presence on Verrsa, ${username}!\n\n6 Tips to Boost Engagement:\n1. Post Consistently\n2. Use Eye-Catching Visuals\n3. Engage with Your Community\n4. Leverage Hashtags\n5. Go Live\n6. Share a Verse – Drop a quick thought (up to 280 characters) with an optional image. Verses appear in the home feed with full engagement features. Tap "+" to post yours now!\n\nThe Verrsa Team`,
}),

// 6. Community Highlights
communityHighlights: (username: string, email: string): EmailTemplate => ({
to: email,
subject: "This Week's Top Moments on Verrsa 🔥",
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: #f093fb;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1>This Week on Verrsa 🔥</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>Here's a roundup of the most amazing moments from this week:</p>

      <h3>🌟 Trending Communities</h3>
      <ul>
        <li>Join the conversation in our fastest-growing communities</li>
        <li>Connect with creators who share your passions</li>
      </ul>

      <h3>🎯 Most-Liked Posts</h3>
      <ul>
        <li>See what's resonating with the community</li>
        <li>Get inspired by top creators</li>
      </ul>

      <h3>📺 Live Stream Highlights</h3>
      <ul>
        <li>Catch up on the best live moments</li>
        <li>Don't miss upcoming live events</li>
      </ul>

      <p>The Verrsa Team</p>
    </div>

     <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>

  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>
  </div>
</body>

</html>
`,
textContent: `This Week on Verrsa, ${username}!\n\nTrending communities, top posts, and live stream highlights await
you!\n\nExplore: https://verrsa.org\n\nThe Verrsa Team`,
}),

// 7. Event/Webinar Invitation
eventInvitation: (
username: string,
email: string,
eventName: string,
eventDate: string,
): EmailTemplate => ({
to: email,
subject: `You're Invited: ${eventName} 🎉`,
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: #764ba2;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #764ba2;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }

    .event-box {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1>You're Invited! 🎉</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>We're excited to invite you to an exclusive event:</p>

      <div class="event-box">
        <h2>${eventName}</h2>
        <p><strong>📅 Date:</strong> ${eventDate}</p>
        <p><strong>🎯 What to Expect:</strong></p>
        <ul>
          <li>Learn from industry experts</li>
          <li>Network with fellow creators</li>
          <li>Discover advanced Verrsa features</li>
          <li>Q&A session with our team</li>
        </ul>
      </div>

      <p>Spots are limited – reserve yours today!</p>

      <a href="https://verrsa.org/events" class="button"
      style="background-color: #00bfff;"
      >RSVP Now</a>

      <p>See you there!</p>


       <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>


  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>
      <p>The Verrsa Team</p>
    </div>
  </div>
</body>

</html>
`,
textContent: `You're Invited, ${username}!\n\n${eventName}\nDate: ${eventDate}\n\nLearn from experts, network with
creators, and discover advanced features.\n\nRSVP: https://verrsa.org/events\n\nThe Verrsa Team`,
}),

// 8. Milestone Celebration
milestoneCelebration: (
username: string,
email: string,
milestone: string,
): EmailTemplate => ({
to: email,
subject: `🎊 Congratulations, ${username}! You've Reached ${milestone}!`,
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
      text-align: center;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header"
      style="background: linear-gradient(135deg, #00bfff 0%, #0391c5 100%);"
    >
      <h1>🎊 Congratulations!</h1>
    </div>
    <div class="content">
      <h2>You've Reached ${milestone}!</h2>
      <p>Hi ${username},</p>
      <p>What an incredible achievement! You've reached ${milestone}, and we couldn't be more proud of you.</p>

      <p>🌟 Your dedication, creativity, and passion inspire us every day.</p>
      <p>🚀 Keep creating amazing content – the community loves what you do!</p>

      <p>Here's to even bigger milestones ahead! 🎉</p>
 <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>


  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>

      <p>The Verrsa Team</p>
    </div>
  </div>
</body>

</html>
`,
textContent: `Congratulations, ${username}!\n\nYou've Reached ${milestone}!\n\nWhat an incredible achievement! Keep
creating amazing content.\n\nThe Verrsa Team`,
}),

// 9. Survey/Feedback Request
feedbackRequest: (username: string, email: string): EmailTemplate => ({
to: email,
subject: "We Want Your Feedback! 💭",
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: #30d6ff;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">
      <h1>We Value Your Opinion! 💭</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>
      <p>Your experience on Verrsa matters to us, and we'd love to hear your thoughts!</p>

      <p>We're conducting a quick 2-minute survey to understand:</p>
      <ul>
        <li>What you love about Verrsa</li>
        <li>What we can improve</li>
        <li>Features you'd like to see next</li>
      </ul>

      <p><strong>As a thank you</strong>, everyone who completes the survey will be entered into a draw to win Premium
        for 6 months – absolutely free!</p>

      <a href="https://verrsa.org/survey" class="button">Take the Survey</a>

      <p>Thank you for helping us build a better Verrsa!</p>

       <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>


  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>

      <p>The Verrsa Team</p>
    </div>
  </div>
</body>

</html>
`,
textContent: `We Value Your Opinion, ${username}!\n\nTake our quick 2-minute survey and help us improve Verrsa. Plus,
win Premium for 6 months!\n\nSurvey: https://verrsa.org/survey\n\nThe Verrsa Team`,
}),

// 10. Exclusive Offer/Limited-Time Deal
exclusiveOffer: (username: string, email: string): EmailTemplate => ({
to: email,
subject: "🎁 Exclusive Offer: 50% Off Premium – Today Only!",
htmlContent: `
<!DOCTYPE html>
<html>

<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: linear-gradient(135deg, #42b8fc 0%, #00a7d1 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .content {
      background: #fff;
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #f5576c;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }

    .urgent {
      background: #fff3cd;
      border: 2px solid #f5576c;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">
      <h1>🎁 Exclusive Offer for You!</h1>
    </div>
    <div class="content">
      <p>Hi ${username},</p>

      <div class="urgent">
        <h2 style="color: #f5576c; margin: 0;">50% OFF Premium – Today Only!</h2>
        <p style="margin: 10px 0;">⏰ Offer expires in 24 hours</p>
      </div>

      <p>We're giving our valued members like you an exclusive chance to upgrade to Verrsa Premium at <strong>50%
          off</strong>!</p>

      <h3>Premium Benefits:</h3>
      <ul>
        <li>⚡ Ad-free experience</li>
        <li>🎨 Exclusive themes</li>
        <li>📊 Advanced analytics</li>
        <li>💎 Priority support</li>
        <li>✨ Early access to new features</li>
      </ul>

      <p><strong>Don't miss out</strong> – this offer is only available for the next 24 hours!</p>

      <a href="https://verrsa.org/VerrsaSubscription?promo=EXCLUSIVE50" class="button">Claim Your 50% Off</a>

       <div style="display: inline-block; margin-top: 10px;">
    <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Verrsa"
      style="width:25%; border-radius:10px; margin-bottom:20px;" />

    <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank">
      <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Verrsa"
        style="width:25%; border-radius:10px; margin-bottom:20px; cursor: pointer;" />
    </a>
  </div>

  <a href="https://www.verrsa.org" target="_blank"
    style="color: #00bfff; text-decoration: underline; cursor: pointer;">www.verrsa.org</a>


  <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
  <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
    You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
  </p>

      <p>The Verrsa Team</p>
    </div>
  </div>
</body>

</html>
`,
textContent: `Exclusive Offer for You, ${username}!\n\n50% OFF Premium – Today Only!\n\nUpgrade now:
https://verrsa.org/VerrsaSubscription?promo=EXCLUSIVE50\n\nOffer expires in 24 hours!\n\nThe Verrsa Team`,
}),
};

// Send marketing email to specific users
export const sendMarketingEmail = async (
templateType: keyof typeof marketingTemplates,
users: Array<{ email: string; username: string }>,
  additionalParams?: any,
  ): Promise<{ success: boolean; results: any }> => {
    const templates: EmailTemplate[] = users.map((user) => {
    const templateFn = marketingTemplates[templateType] as any;
    const params = [
    user.username,
    user.email,
    ...(additionalParams ? Object.values(additionalParams) : []),
    ];
    return templateFn(...params);
    });

    return await emailService.sendBulkEmails(templates);
    };

    // Get all users' emails from auth.users
    export const getAllUserEmails = async (): Promise< Array<{ email: string; username: string }>
      > => {
      try {
      // Get emails from auth.users
      const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

      if (authError) {
      console.error("Error fetching auth users:", authError);
      return [];
      }

      // Get usernames from profiles
      const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username");

      if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return [];
      }

      // Merge email and username
      const users = authUsers.users
      .map((authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      return {
      email: authUser.email || "",
      username: profile?.username || "User",
      };
      })
      .filter((user) => user.email); // Filter out users without email

      return users;
      } catch (error) {
      console.error("Error getting user emails:", error);
      return [];
      }
      };

      // Get inactive users (not active in last 30 days)
      export const getInactiveUserEmails = async (
      daysInactive: number = 30,
      ): Promise<Array<{ email: string; username: string }>> => {
        try {
        const inactiveDate = new Date();
        inactiveDate.setDate(inactiveDate.getDate() - daysInactive);

        // Get inactive users from user_activity table
        const { data: inactiveUsers, error } = await supabase
        .from("user_activity")
        .select("user_id")
        .lt("last_active", inactiveDate.toISOString());

        if (error || !inactiveUsers) {
        console.error("Error fetching inactive users:", error);
        return [];
        }

        const userIds = inactiveUsers.map((u) => u.user_id);

        // Get emails from auth.users
        const { data: authUsers } = await supabase.auth.admin.listUsers();

        // Get usernames from profiles
        const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

        const users =
        (authUsers?.users || [])
        .filter((authUser) => userIds.includes(authUser.id))
        .map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        return {
        email: authUser.email || "",
        username: profile?.username || "User",
        };
        })
        .filter((user) => user.email);

        return users;
        } catch (error) {
        console.error("Error getting inactive user emails:", error);
        return [];
        }
        };

        // Get non-premium users
        export const getNonPremiumUserEmails = async (): Promise< Array<{ email: string; username: string }>
          > => {
          try {
          // Get non-premium users from profiles
          const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, username")
          .or("is_premium.is.null,is_premium.eq.false");

          if (error || !profiles) {
          console.error("Error fetching non-premium users:", error);
          return [];
          }

          const userIds = profiles.map((p) => p.id);

          // Get emails from auth.users
          const { data: authUsers } = await supabase.auth.admin.listUsers();

          const users =
          (authUsers?.users || [])
          .filter((authUser) => userIds.includes(authUser.id))
          .map((authUser) => {
          const profile = profiles.find((p) => p.id === authUser.id);
          return {
          email: authUser.email || "",
          username: profile?.username || "User",
          };
          })
          .filter((user) => user.email);

          return users;
          } catch (error) {
          console.error("Error getting non-premium user emails:", error);
          return [];
          }
          };

          // Example usage:
       /*
          // Send welcome email to all new users
          const newUsers = await getAllUserEmails();
          await sendMarketingEmail('welcomeOnboarding', newUsers);

          // Send re-engagement email to inactive users
          const inactiveUsers = await getInactiveUserEmails(30);
          await sendMarketingEmail('reengagement', inactiveUsers);

          // Send premium upgrade email to non-premium users
          const nonPremiumUsers = await getNonPremiumUserEmails();
          await sendMarketingEmail('premiumUpgrade', nonPremiumUsers);

         // Send feature announcement
          const allUsers = await getAllUserEmails();
          await sendMarketingEmail('featureAnnouncement', allUsers, { featureName: 'Live Chat' });
          */
      