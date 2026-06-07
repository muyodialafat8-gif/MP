import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Info, Sparkles, Smartphone, Award, Tag, Send, Layers, HelpCircle, Flame, ShieldCheck, Ticket } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

interface Plan {
  id: string;
  name: string;
  price: number;
  durationLabel: string;
  durationHours: number;
  quality: string;
  downloads: string;
  badge: string;
  description: string;
  features: string[];
  trending?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: '🆓 Ads-Supported Free Pass',
    price: 0,
    durationLabel: '1 Year Free',
    durationHours: 8760,
    quality: 'Standard Quality (360p - 480p)',
    downloads: 'Local Saves with Ads Enabled',
    badge: 'ADS FULL',
    description: 'Access the complete MoviePulse catalog, subject to compulsory non-skippable commercial ad breaks.',
    features: [
      'Compulsory commercial breaks (FULL)',
      'Requires active data connection',
      'Standard buffering queue',
      'Single device screen limit'
    ],
  },
  {
    id: 'hourly',
    name: '⚡ Lightning Hour Pass',
    price: 500,
    durationLabel: '1 Hour VIP',
    durationHours: 1,
    quality: 'High Definition (720p)',
    downloads: 'Save 1 Video Offline',
    badge: 'QUICK BINGE',
    description: 'Perfect for quick movies on a transport break or lunch hour.',
    features: [
      'High-speed 720p stream transcoding',
      'Low MB data compression mode',
      'Ad-free uninterrupted viewing',
      'Stream on any mobile node'
    ],
  },
  {
    id: 'low_data',
    name: '📶 Smart Low-Data Pass',
    price: 800,
    durationLabel: '24 Hours Lite',
    durationHours: 24,
    quality: 'Mobile Comp (240p - 480p)',
    downloads: 'Save 2 Videos Offline',
    badge: 'DATA SAVER PRO',
    description: 'Highly compressed streaming, saving up to 80% mobile data bundles!',
    features: [
      'Special low-bitrate direct streams',
      'Zero buffering on MTN/Airtel 3G lines',
      'Full catalog access for 24 hours',
      'Zero banner ads during play'
    ],
    trending: true,
  },
  {
    id: 'single_pass',
    name: '🎬 Single Premium Ticket',
    price: 500,
    durationLabel: '12 Hours Single',
    durationHours: 12,
    quality: 'Ultra HD (1080p)',
    downloads: 'Save 1 Video Offline',
    badge: 'SINGLE SHOT',
    description: 'Rent or stream any single premium release of your choice with Extreme clarity.',
    features: [
      '12 Hours active movie accessibility',
      'Extreme FHD crystal movie player',
      'Sound Boost premium audio activated',
      'No platform ads during play'
    ],
  },
  {
    id: 'daily',
    name: '📅 Daily VIP Cinema Pass',
    price: 1600,
    durationLabel: '1 Day VIP',
    durationHours: 24,
    quality: 'Full HD (1080p)',
    downloads: 'Save 5 Videos Offline',
    badge: 'BEST SELLER',
    description: 'Full day continuous high-speed cinema experience.',
    features: [
      '1080p FHD video resolution',
      'Download 5 complete videos',
      'Priority preloading buffer streams',
      'Zero commercial intermissions'
    ],
  },
  {
    id: 'weekly',
    name: '📆 Weekly Ultra Pass',
    price: 6000,
    durationLabel: '7 Days VIP',
    durationHours: 168,
    quality: 'Extreme Full HD (1085p)',
    downloads: 'Save 15 Videos Offline',
    badge: 'WEEKEND BINGE',
    description: 'Best for weekend movie lists, serial releases, and full episode catches.',
    features: [
      'Access on 2 devices simultaneously',
      'Save 15 movie files local storage',
      'Unlock Adult Zone access vault',
      '24/7 priority support hotline access'
    ],
  },
  {
    id: 'monthly',
    name: '👑 Royal Monthly Master VIP',
    price: 25000,
    durationLabel: '30 Days VIP',
    quality: 'Extreme FHD Master',
    downloads: 'Unlimited Saves',
    badge: 'ROYAL VIP',
    durationHours: 720,
    description: 'Ultimate unbounded premium package with massive VIP speed & perks.',
    features: [
      'Simultaneous play on up to 4 devices',
      'No limits offline downloading',
      'Unlock Adult Zone access vault key',
      'Super VIP priority server routing speed'
    ],
  }
];

interface SubscriptionPlansProps {
  onSuccess?: () => void;
  onClose?: () => void;
  userPhone?: string;
  userEmail?: string;
  userName?: string;
}

export default function SubscriptionPlans({ onSuccess, onClose, userPhone = '', userEmail = '', userName = '' }: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[4]); // Default Daily Pass
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0); 
  const [promoAppliedMsg, setPromoAppliedMsg] = useState('');
  const [promoError, setPromoError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MTN' | 'Airtel' | 'Airtime' | 'Voucher'>('MTN');
  
  // Custom Payment submission fields
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || userName || '');
  const [accountEmail, setAccountEmail] = useState(auth.currentUser?.email || userEmail || '');
  const [userPaidPhone, setUserPaidPhone] = useState(auth.currentUser?.phoneNumber || userPhone || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Handle plan selection auto-scrolling
  const selectAndScroll = (plan: Plan) => {
    setSelectedPlan(plan);
    setFeedbackMsg(`Selected Plan: ${plan.name}! Completing checkout...`);
    
    // Clear feedback message after 3.5s
    setTimeout(() => setFeedbackMsg(''), 3500);

    // Smoothly scroll down to checkout form coordinates
    const el = document.getElementById('membership-registry-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyPromo = () => {
    setPromoError('');
    setPromoAppliedMsg('');
    const code = promoCode.trim().toUpperCase();

    if (!code) return;

    if (code === 'VIP50' || code === 'FIRST50') {
      setDiscount(50);
      setPromoAppliedMsg('🚨 Hurray! 50% discount voucher applied successfully!');
    } else if (code === 'KAMPALA256') {
      setDiscount(25);
      setPromoAppliedMsg('Kampala 25% local discount applied!');
    } else {
      setPromoError('Invalid promo or expired activation coupon.');
    }
  };

  const getPriceAfterDiscount = (price: number) => {
    if (discount <= 0) return price;
    return Math.round(price * ((100 - discount) / 100));
  };

  const triggerIHavePaidWhatsApp = async () => {
    if (!fullName.trim()) {
      alert("Please fill in your Full Name to register proof of membership.");
      return;
    }

    const finalPrice = getPriceAfterDiscount(selectedPlan.price);
    const currentEmail = accountEmail.trim() || 'guest@moviepulse.com';
    const currentName = fullName.trim();

    // IF FREE PLAN IS CHOSEN -> ACTIVATE INSTANTLY
    if (selectedPlan.price === 0) {
      setIsVerifying(true);
      try {
        await addDoc(collection(db, 'subscriptions'), {
          userId: auth.currentUser?.uid || 'guest_user',
          userName: currentName,
          userEmail: currentEmail,
          planName: selectedPlan.name,
          price: 0,
          paymentMethod: 'Free (Ads Supported)',
          transactionId: 'FREE_AUTO_INSTANT',
          userPhone: 'none',
          status: 'active', // Active immediately!
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        });
        alert(`Webale Nnyo! ${currentName}, your Ads-Supported Free Pass has been activated successfully! Enjoy the show!`);
        if (onSuccess) onSuccess();
      } catch (err) {
        console.warn("Firestore collection sync warning:", err);
        alert(`Offline fallback: Enjoy the Free Ads Pass!`);
        if (onSuccess) onSuccess();
      }
      setIsVerifying(false);
      return;
    }

    if (!transactionId.trim()) {
      alert("Please enter your Mobile Money Transaction ID or Voucher Ref from your receipt.");
      return;
    }
    if (!userPaidPhone.trim()) {
      alert("Please enter the Mobile number used to send the payment.");
      return;
    }

    setIsVerifying(true);
    const currentPhone = userPaidPhone.trim();

    // Log the transaction attempt to Firestore
    try {
      await addDoc(collection(db, 'subscriptions'), {
        userId: auth.currentUser?.uid || 'guest_user',
        userName: currentName,
        userEmail: currentEmail,
        planName: selectedPlan.name,
        price: finalPrice,
        paymentMethod: paymentMethod,
        transactionId: transactionId.toUpperCase().trim(),
        userPhone: currentPhone,
        status: 'pending_verification',
        expiresAt: new Date(Date.now() + selectedPlan.durationHours * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Firestore collection sync warning: ", e);
    }

    // Prepare MTN/Airtel/Voucher WhatsApp message format
    const whatsappNo = '256766051929'; // MoviePulse Uganda hotline 
    const rawMessage = `Hello MoviePulse Admin! I have completed payment for my Premium VIP account on MoviePulse:
• **Full Name**: ${currentName}
• **Account Email**: ${currentEmail}
• **Selected Plan**: ${selectedPlan.name} (${selectedPlan.durationLabel})
• **Payment Method**: ${paymentMethod} Mobile Money
• **Amount Paid**: UGX ${finalPrice.toLocaleString()} {Promo: ${discount}% OFF}
• **Sender Phone**: ${currentPhone}
• **Transaction ID**: ${transactionId.toUpperCase().trim()}

Please verify and activate my Premium Stream Pass immediately! Webale!`;

    const encodedMsg = encodeURIComponent(rawMessage);
    const whatsappUrl = `https://wa.me/${whatsappNo}?text=${encodedMsg}`;

    setIsVerifying(false);
    
    // Open in new tab or same coordinate frames
    window.open(whatsappUrl, '_blank');
    if (onSuccess) onSuccess();
  };

  return (
    <div className="bg-[#0b0a0f] p-4 sm:p-6 rounded-3xl border border-[#ff0a16]/30 shadow-2xl relative w-full overflow-hidden text-gray-200">
      
      {/* Absolute top glowing decorations */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>
      <div className="absolute top-0 right-0 p-4 z-40">
        {onClose && (
          <button 
            id="close-sub-plans"
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-black/60 hover:bg-red-600 rounded-full p-2 border border-gray-800 transition text-[10px] px-3 font-mono font-bold"
          >
            ✕ CLOSE
          </button>
        )}
      </div>

      {/* Headings */}
      <div className="text-center max-w-xl mx-auto mb-6 pt-3 relative z-10">
        <div className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-red-950 to-red-900 text-[#ff4c57] border border-red-500/30 px-3 py-1 rounded-full text-[9px] font-mono font-black mb-2.5 uppercase tracking-widest animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>🚀 CHOOSE YOUR TICKET AND START STREAMING INSTANTLY!</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white font-sans uppercase">
          MoviePulse <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-amber-500">Premium Pass</span> 🇺🇬
        </h2>
        <p className="text-xs text-gray-300 mt-1.5 font-sans leading-relaxed">
          Skip buffering constraints and unlock direct 1080p FHD performance! Download movies locally to conserve mobile data bundles, or enjoy our 100% free ad-supported subscription.
        </p>
      </div>

      {/* Pop feedback notifier */}
      {feedbackMsg && (
        <div className="bg-red-950/90 border border-red-500 text-red-100 px-4 py-2 rounded-xl text-center text-xs font-mono mb-4 animate-bounce">
          {feedbackMsg}
        </div>
      )}

      {/* Grid of plans with dynamic Netflix + Pearl Pix theme card effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan.id === plan.id;
          const isFree = plan.price === 0;
          return (
            <motion.div
              key={plan.id}
              onClick={() => selectAndScroll(plan)}
              whileHover={{ y: -4, scale: 1.015 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative flex flex-col justify-between ${
                isFree 
                  ? isSelected 
                    ? 'bg-gradient-to-b from-[#181818] to-black border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] ring-1 ring-yellow-500' 
                    : 'bg-[#0f0f0f] border-gray-900 border-dashed hover:border-gray-700'
                  : isSelected
                    ? 'bg-gradient-to-b from-[#ff0a16]/15 via-[#0e0a0d] to-black border-[#ff0a16] shadow-[0_0_25px_rgba(229,9,20,0.35)] ring-1 ring-[#ff0a16]'
                    : 'bg-[#0e0d12] border-gray-900 hover:border-gray-800'
              }`}
            >
              {isSelected && (
                <span className={`absolute -top-2.5 right-3 text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow ${
                  isFree ? 'bg-yellow-500 text-black' : 'bg-red-600 text-white'
                }`}>
                  PLAN SELECTED »
                </span>
              )}
              
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xs font-black text-white uppercase tracking-tight flex items-center space-x-1">
                    <span>{plan.name}</span>
                  </h3>
                  <span className={`text-[8px] font-bold border rounded px-1.5 py-0.5 uppercase ${
                    isFree 
                      ? 'bg-yellow-950/40 text-yellow-500 border-yellow-900/30' 
                      : 'bg-red-950/40 text-red-500 border-red-900/30'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-sans leading-snug h-8 line-clamp-2">{plan.description}</p>
                
                {/* Specific features display list */}
                <div className="mt-3.5 space-y-1.5 text-[10px] border-t border-gray-950 pt-2 bg-black/20 p-2 rounded-lg">
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="font-sans font-semibold text-gray-200">Quality: <strong className="text-white">{plan.quality}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="font-sans font-semibold text-gray-200">Downloads: <strong className="text-white">{plan.downloads}</strong></span>
                  </div>
                  {plan.features.slice(0, 2).map((feat, i) => (
                    <div key={i} className="flex items-center space-x-1.5 text-gray-400">
                      <span className="text-red-500 font-black">•</span>
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-black/40 flex justify-between items-center">
                <div className="flex items-baseline space-x-0.5">
                  {isFree ? (
                    <span className="text-sm font-black text-[#25D366] uppercase">100% FREE</span>
                  ) : (
                    <>
                      <span className="text-[9px] font-mono font-extrabold text-yellow-500">UGX</span>
                      <span className="text-lg font-mono font-black text-white">{(getPriceAfterDiscount(plan.price)).toLocaleString()}</span>
                      <span className="text-[9px] text-gray-500 font-mono">/{plan.durationLabel}</span>
                    </>
                  )}
                </div>
                <span className="text-[9px] font-mono text-red-500 font-bold hover:underline">Select & Review »</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pricing Voucher / Referral code box */}
      <div className="bg-[#0e0d12] rounded-2xl p-4 border border-gray-900 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black text-white font-mono uppercase block flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-red-500" />
            <span>🎫 APPLY PROMO VOUCHER CODE</span>
          </span>
          <span className="text-[10px] text-gray-400 font-sans">Use coupon <strong className="text-red-500">FIRST50</strong> to claim a massive 50% discount on any VIP plan!</span>
        </div>
        <div className="flex space-x-2 shrink-0 max-w-sm w-full md:w-auto">
          <input
            id="coupon-voucher"
            type="text"
            placeholder="e.g. FIRST50, VIP50"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="flex-1 bg-black rounded-xl px-3 py-1.5 text-xs text-white border border-gray-800 focus:outline-[#ff0a16] uppercase font-mono tracking-wider"
          />
          <button
            id="apply-coupon-btn"
            onClick={applyPromo}
            className="bg-[#242424] hover:bg-red-600 hover:text-white text-gray-300 font-bold px-4 py-1.5 rounded-xl text-xs transition"
          >
            Apply
          </button>
        </div>
      </div>
      {promoAppliedMsg && <p className="text-xs text-emerald-400 font-semibold mb-4 px-1">{promoAppliedMsg}</p>}
      {promoError && <p className="text-xs text-red-500 font-semibold mb-4 px-1">{promoError}</p>}

      {/* Uganda Mobile Money payment reference guidelines - Hide for Free Plan */}
      {selectedPlan.price > 0 ? (
        <div className="bg-[#0c0b10] rounded-2xl p-4 border border-[#ff0a16]/10 mb-6">
          <h4 className="text-xs font-mono font-black text-yellow-500 uppercase flex items-center space-x-1.5 mb-3">
            <Smartphone className="w-4 h-4 text-yellow-400" />
            <span>📲 CHOOSE YOUR MOBILE MONEY FINISHING PLATFORM:</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-gray-300">
            <div className={`p-3 rounded-xl border relative transition ${
              paymentMethod === 'MTN' ? 'bg-[#181818]/60 border-yellow-500' : 'bg-[#0f0f0f] border-gray-950/60'
            }`} onClick={() => setPaymentMethod('MTN')}>
              <span className="absolute top-2 right-2 bg-yellow-500/10 text-yellow-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">MTN MoMo</span>
              <p className="font-bold text-white mb-2 underline cursor-pointer">Option A: MTN Mobile Money</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-400 text-[10px]">
                <li>Dial <span className="text-white font-bold">*165#</span> on your MTN line</li>
                <li>Select <span className="text-white">Send Money</span></li>
                <li>Enter MoMo No: <span className="text-yellow-400 font-bold">0766051929</span> (MoviePulse)</li>
                <li>Send Amount: <span className="text-yellow-400 font-bold">UGX {getPriceAfterDiscount(selectedPlan.price).toLocaleString()}</span></li>
                <li>Write down receipt Transaction ID for registration below</li>
              </ol>
            </div>
            <div className={`p-3 rounded-xl border relative transition ${
              paymentMethod === 'Airtel' ? 'bg-[#181818]/60 border-red-500' : 'bg-[#0f0f0f] border-gray-950/60'
            }`} onClick={() => setPaymentMethod('Airtel')}>
              <span className="absolute top-2 right-2 bg-red-600/15 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Airtel Money</span>
              <p className="font-bold text-white mb-2 underline cursor-pointer">Option B: Airtel Money</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-400 text-[10px]">
                <li>Dial <span className="text-white font-bold">*185#</span> on your Airtel line</li>
                <li>Select <span className="text-white">Send Money</span></li>
                <li>Enter Recipient: <span className="text-red-500 font-bold">0704557858</span></li>
                <li>Send Amount: <span className="text-red-500 font-bold">UGX {getPriceAfterDiscount(selectedPlan.price).toLocaleString()}</span></li>
                <li>Write down receipt Transaction ID for registration below</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#25D366]/10 rounded-2xl p-4 border border-[#25D366]/20 mb-6 flex items-center space-x-3">
          <ShieldCheck className="w-8 h-8 text-[#25D366] shrink-0" />
          <div>
            <span className="text-xs font-mono font-black text-[#25D366] uppercase block">🟢 FREE INSTANT TRIAL ACTIVATION ACTIVE</span>
            <p className="text-[11px] text-gray-300">You selected the Ads-Supported Free plan. No Mobile Money transaction fees apply. Just insert your registration details below and tap Activate!</p>
          </div>
        </div>
      )}

      {/* Professional payment form (Fully requested in specifications) */}
      <div id="membership-registry-form" className="scroll-mt-6">
        <h3 className="text-xs font-mono font-black text-white mb-3 uppercase flex items-center space-x-1.5">
          <Layers className="w-4 h-4 text-red-500" />
          <span>COMPLETE YOUR SUBSCRIPTION FINISHING PROFILE:</span>
        </h3>
        
        <div className="bg-[#0a0a0d]/90 border border-[#ff0a16]/10 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono text-gray-400 block mb-1 uppercase font-bold">1. Subscriber First & Last Name *</label>
            <input
              id="sender-fullname"
              type="text"
              required
              placeholder="e.g. Kato John Bosco"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#121215] rounded-xl px-4 py-2.5 text-xs text-white border border-gray-850 hover:border-gray-800 focus:outline-[#ff0a16]"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-gray-400 block mb-1 uppercase font-bold">2. Contact Email *</label>
            <input
              id="sender-sub-email"
              type="email"
              required
              placeholder="name@gmail.com"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              className="w-full bg-[#121215] rounded-xl px-4 py-2.5 text-xs text-white border border-gray-850 hover:border-gray-800 focus:outline-[#ff0a16]"
            />
          </div>

          {selectedPlan.price > 0 && (
            <>
              <div>
                <label className="text-[10px] font-mono text-gray-400 block mb-1 uppercase font-bold">3. Registered Mobile/Voucher (Funding line) *</label>
                <input
                  id="sender-phone"
                  type="text"
                  required
                  placeholder="e.g. 0766051929 or 0704557858"
                  value={userPaidPhone}
                  onChange={(e) => setUserPaidPhone(e.target.value)}
                  className="w-full bg-[#121215] rounded-xl px-4 py-2.5 text-xs text-white border border-gray-855 hover:border-gray-800 focus:outline-[#ff0a16] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-gray-400 block mb-1 uppercase font-bold">4. Select Pay Channel *</label>
                <select
                  id="payment-provider"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#121215] rounded-xl px-4 py-2.5 text-xs text-white border border-gray-855 hover:border-gray-800 focus:outline-[#ff0a16] font-mono font-bold"
                >
                  <option value="MTN">MTN Uganda Mobile Money 📲</option>
                  <option value="Airtel">Airtel Uganda Money 💳</option>
                  <option value="Airtime">Direct Airtime Transfer 📶</option>
                  <option value="Voucher">Scratch Card Reference Pin 🎟️</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-mono font-black text-yellow-500 block mb-1 uppercase">
                  5. Transaction ID Code / Receipt Reference Pin *
                </label>
                <input
                  id="sender-transaction-ref"
                  type="text"
                  required
                  placeholder="Paste transaction ref from SMS e.g. PP240604..."
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full bg-[#121215] rounded-xl px-4 py-2.5 text-xs text-white border border-[#ff0a16]/60 focus:border-[#ff0a16] focus:outline-none font-mono uppercase tracking-wider font-extrabold"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2 bg-gradient-to-r from-red-950/20 to-[#0e0e0f] border border-red-950 p-3 rounded-xl flex items-center space-x-2 text-[11px] font-sans text-gray-300">
            <Info className="w-4 h-4 text-red-500 shrink-0" />
            <p>
              Plan selected: <strong className="text-white">{selectedPlan.name}</strong>. {selectedPlan.price > 0 ? (
                <>Required amount: <strong className="text-yellow-400">UGX {getPriceAfterDiscount(selectedPlan.price).toLocaleString()}</strong> {discount > 0 && `(${discount}% Discount Applied)`}.</>
              ) : (
                <strong className="text-[#25D366]">Completed instantly with no service charge.</strong>
              )}
            </p>
          </div>

          <div className="md:col-span-2 pt-2">
            {/* Animated Glowing Submit Button */}
            <motion.button
              id="sub-submit-btn"
              onClick={triggerIHavePaidWhatsApp}
              disabled={isVerifying}
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full py-3.5 rounded-2xl flex items-center justify-center space-x-2 font-black transition-all duration-350 ${
                selectedPlan.price === 0
                  ? 'bg-gradient-to-r from-[#25D366] to-[#1ebd54] text-white hover:shadow-[0_0_20px_rgba(37,211,102,0.45)]'
                  : 'bg-gradient-to-r from-[#ff0a16] to-red-800 hover:from-red-600 hover:to-red-700 text-white shadow-[0_0_20px_rgba(229,9,20,0.35)]'
              }`}
            >
              {selectedPlan.price === 0 ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span className="font-sans font-black tracking-widest text-xs uppercase">
                    ACTIVATE MY FREE TIER STREAMING PASS NOW
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span className="font-sans font-black tracking-widest text-xs uppercase">
                    I HAVE PAID — SUBMIT DETAILS TO ADMIN VIA WHATSAPP
                  </span>
                </>
              )}
            </motion.button>
            
            <p className="text-[9px] text-gray-500 text-center font-mono mt-2 uppercase">
              {selectedPlan.price === 0 
                ? 'Your Free account will be updated in Firestore instantly.' 
                : 'Redirects with billing invoice to Ugandan support line at +256766051929 for lightning-speed approval.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
