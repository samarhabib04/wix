'use client';

import React from 'react';
import NavigationSection from '@/components/NavigationSection';

export default function Terms() {
  return (
    <>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-berkshire text-brand-dark-green mb-6">
          DogQuest.ie Terms & Conditions
        </h1>
        
        <div className="prose prose-green max-w-none space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Effective Date:</strong> 01 July 2025
            </p>
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> 3 April 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to DogQuest.ie ("DogQuest", "we", "us", "our"). These Terms & Conditions 
              ("Terms") govern your access to and use of our website and services (together, the 
              "Platform"), including features for listing, verifying, reserving, or purchasing dogs and for 
              buying products via the DogQuest Shop.
            </p>
            <p className="mb-4">
              By accessing or using the Platform, you accept these Terms in full. If you do not agree, do 
              not use the Platform.
          </p>
            <p className="mb-4">
              <strong>Platform role & no agency.</strong> DogQuest is an online classifieds/marketplace only. We do not 
              own, breed, sell, purchase, transport, hold, inspect, or keep animals, and we are not a party 
              to contracts between buyers and sellers. Listings and content are user-generated; DogQuest 
              does not guarantee their accuracy, legality, quality, health, lineage, or suitability. Contracts 
              for animals or services are exclusively between users.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">2. Purpose of the Platform</h2>
            <p className="mb-4">
              DogQuest provides tools for users in Ireland and Northern Ireland to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>list puppies/dogs for sale or reservation;</li>
              <li>list stud services;</li>
              <li>post Showcase items (e.g., upcoming litters);</li>
              <li>purchase dog accessories via the DogQuest Shop;</li>
              <li>buy visibility upgrades ("Boosts");</li>
              <li>use messaging, wishlists, and breed-matching/quiz features.</li>
            </ul>
            <p>
              We may add, modify, or remove features at any time.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">3. Account Registration & Verification</h2>
            <p className="mb-4">
              To post listings or transact you must:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>be 18+ and create a buyer, seller, or business account;</li>
              <li>provide accurate, current information;</li>
              <li>complete any identity and/or payment verification (e.g., phone/SMS, and Stripe Connect 
              onboarding for seller payouts).</li>
            </ul>
            <p>
              DogQuest may refuse, suspend, or remove accounts where verification is incomplete, 
              inaccurate, or fails our checks.
            </p>
          </section>
          
          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">4. Payments & Fees</h2>
            <p className="mb-4"><strong>Buyers:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Make an Offer:</strong> Buyers can digitally submit a proposed price to the seller. No funds are held
              or taken when placing an offer.</li>
              <li><strong>Reserve a Puppy:</strong> You can reserve any puppy with a €50 deposit, which is held securely in 
              escrow until the sale goes through. Once completed, €40 is released to the seller and €10 is 
              retained by DogQuest as part of the service.</li>
            </ul>
            <p className="mb-4"><strong>Sellers:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Pay listing fees and can purchase optional Boosts.</li>
              <li>Must provide banking details through Stripe to receive payouts.</li>
            </ul>
            <p className="mb-4"><strong>Listing boosts available:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Gold:</strong> €20 - Top of homepage (24/7, max 5 slots)</li>
              <li><strong>Elite:</strong> €12.50 - Homepage carousel (max 20 slots) + top of breed</li>
              <li><strong>Premium:</strong> €10 - Homepage 2nd row carousel (max 40 slots) + top of breed</li>
              <li><strong>Standard:</strong> €5 - Top of breed listings</li>
            </ul>
            <p className="mb-4">
              <strong>Processing:</strong> All payments are securely handled via Stripe. Platform and Stripe fees may 
              apply and will be deducted from your payout. DogQuest may place reserves, holds, or set
              offs against payouts in cases of refunds, chargebacks, fraud, disputes, compliance checks, or 
              risk.
            </p>
            <p className="mb-4">
              <strong>Chargebacks & negative balances:</strong> You authorise DogQuest to recover any negative balance 
              or chargeback from your payouts or chosen payment method.
</p>
          </section>
          
          {/* Section 4A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">4A. Legal Compliance & Mandatory Listing Information (Ireland / NI)</h2>
            <p className="mb-4">
              You are solely responsible for complying with all applicable laws when advertising, selling, 
              reserving, transporting, or rehoming dogs. This includes, without limitation:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Registered Seller of Pets (6+ animals/year).</strong> Must register with the Department of 
              Agriculture (DAFM) and include registration/licence number in ads.</li>
              <li><strong>Dog Breeding Establishments (DBE).</strong> Keeping 6+ breeding bitches may require DBE 
              licensing with local authorities.</li>
              <li><strong>Microchipping.</strong> It is illegal to sell or advertise a dog not microchipped and registered; ads 
              must show the chip number.</li>
              <li><strong>Mandatory details.</strong> Ads must include date of birth, country of birth, and microchip info.</li>
              <li><strong>Minimum ages.</strong> Puppies must be microchipped (usually 6 weeks) before advertising and at
              least 8 weeks before rehoming.</li>
            </ul>
            <p>
              DogQuest may remove or block non-compliant listings and may share information with 
              authorities where required.
            </p>
          </section>

          {/* Section 4B */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">4B. Offers – Terms & Limitations</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Non-binding:</strong> Submitting an Offer does not create a legally binding agreement between 
              buyer and seller. It is an expression of interest only.</li>
              <li><strong>Seller discretion:</strong> Sellers may accept, reject, or counter any offer at their sole discretion.</li>
              <li><strong>Offer validity:</strong> Offers are valid for a period of 72 hours unless withdrawn or countered. 
              After that time, they may be considered expired.</li>
              <li><strong>No reservation:</strong> Submitting an offer does not reserve or hold the puppy. To reserve, the 
              buyer must use the official "Reserve" button and pay the deposit.</li>
              <li><strong>Abuse of system:</strong> Repeated spamming of offers or misuse of the Offer feature may lead 
              to account suspension.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">5. Boosted Listings</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Boost durations and prices are shown at purchase.</li>
              <li>Boosts increase visibility only and do not guarantee leads or sales.</li>
              <li>Boosts do not auto-renew and are non-refundable once active.</li>
            </ul>
          </section>

          {/* Section 5A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">5A. Showcase Listings</h2>
            <p className="mb-4"><strong>Purpose.</strong> Showcase is a feature that allows users to display a photo and general location of 
            puppies or litters for visibility only. It is not an advertisement, does not include pricing, and 
            does not enable enquiries, reservations, or sales.</p>
            <p className="mb-4"><strong>Nature of Showcase.</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Showcase entries are for informational display only.</li>
              <li>They do not represent an offer for sale, an advertisement, or any form of commitment.</li>
              <li>Interested users may register their email address to be notified when (and only if) the 
              animal is later listed as a fully compliant sales listing on DogQuest.</li>
              <li>DogQuest stores the notification request only and is not responsible for the accuracy, 
              timing, or outcome of any later listing.</li>
            </ul>
            <p className="mb-4"><strong>Timing rules.</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Puppies may appear in Showcase from 4 weeks of age.</li>
              <li>Puppies must not be rehomed before 8 weeks of age and only after legal microchipping 
              requirements are met.</li>
            </ul>
            <p className="mb-4"><strong>Restrictions.</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Showcase entries are limited to a photo and rough location only.</li>
              <li>No pricing, contact details, or direct sale information may be included.</li>
              <li>DogQuest may remove Showcase entries that attempt to bypass these restrictions.</li>
            </ul>
            <p className="mb-4"><strong>Fees.</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Showcase entries may be subject to fees as displayed on the Platform.</li>
              <li>Fees are non-refundable once the entry is live.</li>
            </ul>
          </section>
          
          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">6. Listings & Health Verifications</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Accuracy.</strong> Sellers must ensure listings (text, photos, documents) are accurate and lawful.</li>
              <li><strong>Ownership.</strong> You may only list animals you lawfully own or have the right to sell.</li>
              <li><strong>Health badges.</strong> Green Tick = Vaccinations verified. Gold Star = Vet health check verified.</li>
              <li><strong>Important note.</strong> These reflect a snapshot on the exam date only. DogQuest does not 
              provide vet services and does not guarantee outcomes.</li>
              <li><strong>Buyer responsibility.</strong> Buyers are strongly advised to arrange independent vet checks.</li>
              <li><strong>Vet independence.</strong> Participating vets are independent professionals. DogQuest does not 
              employ or control them.</li>
              <li><strong>Scope of vet exam:</strong> Unless otherwise stated, DogQuest badges cover eyes, ears, lungs, and 
              heart, and confirm the puppy was bright and alert on that day only. They do not assess 
              genetics, temperament, hips/elbows, parasites, or future health.</li>
            </ul>
            <p className="mb-4">
              DogQuest may remove any listing that is unlawful, non-compliant, or misleading.
            </p>
            <p className="mb-4">
              <strong>Pricing Disclaimer:</strong> DogQuest is not responsible for changes in listing prices. All pricing 
              is controlled by the seller.
            </p>
            <p>
              <strong>Expiry:</strong> Listings may expire or be hidden after 30 days of inactivity or where compliance
              information is missing.
            </p>
          </section>
          
          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">7. Reservation Payments</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Buyer selects "Reserve" and pays deposit (€50) via DogQuest.</li>
              <li>Deposit is held securely until completion, cancellation, or dispute outcome.</li>
              <li>
                Once buyer and seller have both confirmed, a 14-day escrow period applies before
                release/finalisation (unless cancelled or disputed sooner under these Terms).
              </li>
              <li>
                From the €50 reservation payment, €10 is retained by DogQuest as a platform fee and
                €40 is allocated to the seller (subject to cancellation, dispute, chargeback, and
                compliance outcomes).
              </li>
            </ul>
            <p className="mb-4"><strong>Refund rules:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                Buyer cancels → the €10 platform fee remains non-refundable; the remaining amount (if
                eligible) is handled under the active reservation/cancellation policy.
              </li>
              <li>Seller cancels → full refund.</li>
              <li>
                No response / failure to complete within the 14-day escrow window → DogQuest may
                cancel, release, or refund at discretion based on evidence and policy.
              </li>
            </ul>
            <p className="mb-4">
              <strong>Disputes:</strong> Must be evidenced (DogQuest chat logs, vet docs, non-collection proof). DogQuest 
              reviews and makes an administrative decision only.
            </p>
            <p>
              <strong>Refund Processing:</strong> Approved refunds will be processed within 5–10 business days 
              depending on your payment provider.
            </p>
          </section>

          {/* Section 7A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">7A. Collection, Transport & Risk</h2>
            <p className="mb-4">
              Collection & Transport are arranged directly between buyer and seller. DogQuest does not 
              arrange or supervise transport.
            </p>
            <p className="mb-4">
              <strong>Risk Transfer.</strong> Risk of loss, injury, or harm to the animal transfers to the buyer upon 
              collection from the seller or upon handover to any third‑party transporter engaged by the 
              buyer, whichever occurs first, unless a different allocation is required by law or expressly 
              agreed in writing between buyer and seller.
            </p>
            <p>
              <strong>No Liability.</strong> DogQuest is not liable for any incidents, injury, illness, delay, or loss arising 
              during transport or after collection.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">8. Product Sales (Shop)</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>DogQuest acts as a reseller for third-party goods and does not manufacture them.</li>
              <li>No warranties by DogQuest; manufacturer warranties (if any) apply.</li>
              <li>Liability for products is limited to the price paid, subject to non-excludable consumer rights.</li>
            </ul>
          </section>

          {/* Section 8A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">8A. Business Listings & Vet Partner Accounts</h2>
            <p className="mb-4">
              DogQuest may offer business listings for dog-related service providers, dog-related product
              sellers, and approved veterinary practices or professionals (&quot;Vet Partners&quot;).
            </p>
            <p className="mb-4">
              Business listings and Vet Partner listings are separate categories on the Platform and may be
              displayed, managed, ranked, and marketed differently.
            </p>
            <p className="mb-4">
              DogQuest may approve, reject, suspend, remove, edit, reclassify, or limit any business or Vet
              Partner profile at its discretion, including where information is incomplete, misleading,
              unlawful, inaccurate, inappropriate, outside scope, or inconsistent with DogQuest standards or
              trust policies.
            </p>
            <p className="mb-4">
              Businesses and Vet Partners are responsible for ensuring that all profile content, services,
              claims, images, pricing, contact details, licences, registrations, and other submitted
              information are accurate, lawful, current, and not misleading.
            </p>
            <p className="mb-4">
              DogQuest is a listing and discovery platform only. DogQuest does not provide, supervise,
              endorse, guarantee, insure, or take responsibility for any business services, veterinary
              services, products, advice, treatment, outcomes, bookings, transactions, or representations
              made by businesses or Vet Partners.
            </p>
            <p>
              Any contract, service arrangement, booking, treatment, sale, purchase, enquiry, communication,
              or dispute between a user and a business or Vet Partner is strictly between those parties
              unless DogQuest is expressly stated to be the seller of record.
            </p>
          </section>

          {/* Section 8B */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">8B. Business Subscription Tiers</h2>
            <p className="mb-4">
              DogQuest may offer different business subscription tiers, plans, features, pricing, billing
              cycles, and eligibility requirements, as displayed on the Platform from time to time.
            </p>
            <p className="mb-4">Business plans may include, for example:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                Standard Business – a basic business directory listing with profile visibility on the
                Platform.
              </li>
              <li>
                Premium Business – a higher-tier business listing which may include enhanced visibility,
                premium badges, reviews, enquiry forms, eligibility for promotions, eligibility for boosts,
                and, where applicable, access to additional business selling features.
              </li>
            </ul>
            <p className="mb-4">
              Unless expressly stated otherwise on the Platform, paid business plans are subscription
              services which may renew automatically or manually in accordance with the checkout terms shown
              at purchase.
            </p>
            <p className="mb-4">
              DogQuest may change pricing, included features, eligibility rules, ranking logic, display logic,
              placements, or subscription structures at any time, subject to applicable law and notice
              requirements where required.
            </p>
            <p className="mb-4">
              Payment for a business subscription gives access only to the features expressly included in that
              plan at the time of purchase. It does not guarantee profile views, enquiries, leads, bookings,
              sales, customer response, ranking position, business performance, or commercial success.
            </p>
            <p>
              Where DogQuest permits plan upgrades, any upgrade treatment, credit, carry-forward value, or
              billing adjustment will be handled according to the rules displayed on the Platform at that
              time. Unless stated otherwise, downgrade refunds are not guaranteed.
            </p>
          </section>

          {/* Section 8C */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">8C. Vet Partner Listings</h2>
            <p className="mb-4">
              DogQuest may operate a separate Vet Partner category for approved veterinary practices or
              professionals.
            </p>
            <p className="mb-4">
              Vet Partner status is subject to DogQuest approval and may be limited to invited, approved,
              screened, or otherwise selected veterinary participants.
            </p>
            <p className="mb-4">
              DogQuest may offer different Vet Partner visibility levels, including free or paid visibility
              options, as described on the Platform from time to time.
            </p>
            <p className="mb-4">
              A Vet Partner badge, listing, profile, placement, or visibility feature indicates only that the
              relevant profile has been accepted by DogQuest into that category at that time. It does not
              constitute a guarantee, warranty, endorsement, insurance, clinical assurance, or representation
              by DogQuest regarding the Vet Partner&apos;s services, availability, quality, competence, advice,
              treatment, or outcomes.
            </p>
            <p className="mb-4">
              Vet Partners remain independent third parties. DogQuest does not employ, supervise, control,
              or direct their professional work.
            </p>
            <p>
              DogQuest may remove, suspend, limit, or alter Vet Partner visibility, category status, search
              placement, carousel placement, or account access at any time where required for trust,
              compliance, operational, legal, quality-control, or commercial reasons.
            </p>
          </section>

          {/* Section 8D */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">8D. Business Marketplace</h2>
            <p className="mb-4">
              Certain approved businesses may be permitted to sell physical dog-related products through
              business marketplace features on the Platform.
            </p>
            <p className="mb-4">
              Marketplace selling access is available only where DogQuest enables that feature for the
              relevant business account and approves the business and/or its products.
            </p>
            <p className="mb-4">
              Unless expressly stated otherwise, businesses selling through these features are responsible for
              their own product listings, pricing, stock, fulfilment, delivery, returns handling, legal
              compliance, consumer law compliance, product safety, warranties, and after-sales support.
            </p>
            <p className="mb-4">
              DogQuest may require product approval before a product goes live and may reject, suspend,
              remove, edit, or delist any product at its discretion.
            </p>
            <p className="mb-4">
              Where the Platform uses a connected payment processor or split-payment system, DogQuest may
              deduct platform fees, commissions, payment processing charges, refunds, chargebacks, reserve
              amounts, penalties, or other sums before releasing any balance.
            </p>
            <p className="mb-4">
              Access to a business marketplace feature does not guarantee product approval, product
              visibility, traffic, sales volume, conversion, revenue, or uninterrupted selling access.
            </p>
            <p>
              DogQuest may suspend or remove business marketplace access where a business breaches these
              Terms, receives repeated complaints, creates legal or trust risk, fails fulfilment standards,
              lists prohibited goods, or otherwise creates operational or compliance concerns.
            </p>
          </section>

          {/* Section 8E */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">8E. Business Promotions, Boosts & Visibility</h2>
            <p className="mb-4">
              DogQuest may offer optional paid or unpaid visibility tools for businesses and/or Vet Partners,
              including promotions, boosted placements, featured slots, premium placements, county priority
              placements, homepage placements, directory placements, carousel placements, geo-located
              placements, or similar discovery tools.
            </p>
            <p className="mb-4">
              Such tools increase visibility only. They do not guarantee impressions, enquiries, leads,
              bookings, sales, ranking permanence, or commercial results.
            </p>
            <p className="mb-4">
              DogQuest may apply rotation logic, ranking logic, freshness logic, location logic, category
              logic, relevance logic, fairness logic, slot limits, capacity limits, county limits, homepage
              limits, queue logic, or other display rules at its discretion.
            </p>
            <p className="mb-4">Unless expressly stated otherwise on the Platform:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>promotions do not guarantee top ranking;</li>
              <li>boosts and featured placements are temporary;</li>
              <li>
                visibility placements may be affected by newer purchases, available inventory, geography,
                category relevance, moderation decisions, and platform design changes;
              </li>
              <li>paid visibility fees are non-refundable once the purchased visibility has gone live.</li>
            </ul>
            <p className="mb-4">
              DogQuest may change the location, format, wording, design, slot number, duration, eligibility
              rules, placement rules, or availability of any promotional or boosted feature at any time.
            </p>
            <p>
              DogQuest may keep business advertising, business promotions, and Vet Partner trust-related
              placements visually and commercially separate from dog sale listings, breeder content, or other
              trust-based content where DogQuest considers that distinction necessary.
            </p>
          </section>

          {/* Section 8F */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">8F. Business Content, Conduct & Approvals</h2>
            <p className="mb-4">Businesses and Vet Partners must not:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>publish false, deceptive, exaggerated, or unsubstantiated claims;</li>
              <li>misrepresent qualifications, services, approvals, registrations, products, or prices;</li>
              <li>upload content that infringes third-party rights;</li>
              <li>advertise unlawful, prohibited, unsafe, or non-compliant products or services;</li>
              <li>misuse DogQuest messaging, reviews, badges, enquiry forms, trust features, or category status;</li>
              <li>attempt to impersonate a Vet Partner, approved business, or verified business status.</li>
            </ul>
            <p className="mb-4">
              DogQuest may require supporting documents, licences, registrations, identity checks, business
              details, or other verification before approving or maintaining a business or Vet Partner
              profile.
            </p>
            <p className="mb-4">
              DogQuest may moderate, edit, reject, suspend, restrict, remove, or reclassify any business or
              Vet Partner content, review, reply, product, image, profile element, enquiry feature, badge, or
              subscription feature at its discretion.
            </p>
            <p>
              Businesses and Vet Partners are solely responsible for all interactions with users, all
              compliance obligations, and all consequences arising from the services, advice, goods,
              communications, or representations they provide.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">9. Regional Use & Limitations</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>DogQuest is available only in Ireland & Northern Ireland.</li>
              <li>Features may be restricted by region.</li>
              <li>Users are responsible for compliance with transport/import/local law obligations.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">10. Data & Privacy</h2>
            <p className="mb-4">
              We process data under GDPR using secure providers (e.g., Supabase for storage, Resend for 
              email). See our Privacy Policy and Cookie Policy for full details.
            </p>
          </section>
          
          {/* Section 10A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">10A. Cookies & Tracking</h2>
            <p>
              We use cookies and similar technologies (including analytics and performance tracking) to 
              operate and improve the Platform, for security, and to measure usage. Details are set out in 
              our Cookie Policy. By using the Platform, you consent to our use of cookies as described 
              there.
            </p>
          </section>

          {/* Section 10B */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">10B. Data Retention & Deletion</h2>
            <p>
              We retain personal data for as long as your account is active or as needed to provide 
              services, comply with law, and resolve disputes. Under GDPR you may request access, 
              correction, deletion, restriction, or export of your data. See our Privacy Policy for full details
              and how to exercise your rights.
            </p>
          </section>
          
          {/* Section 11 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">11. Communication</h2>
            <p>
              By using DogQuest, you consent to receive:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Transactional emails/notifications;</li>
              <li>Service alerts and messages;</li>
              <li>Marketing emails where you've opted in (you can opt out).</li>
            </ul>
          </section>
          
          {/* Section 11A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">11A. Wishlist, Saved Searches & Email Alerts</h2>
            <p>
              Users may save listings to a wishlist and create saved searches or alerts. Alerts are provided
              on a best‑effort basis; DogQuest is not responsible for missed or delayed notifications, 
              matching accuracy, or outcomes.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">12. Listings & Platform Rules</h2>
            <p className="mb-4"><strong>Prohibited actions:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Posting unlawful, misleading, or fraudulent listings.</li>
              <li>Circumventing payments/reservations.</li>
              <li>Using the Platform outside supported regions.</li>
              <li>Breaching animal welfare, sale, or breeding laws.</li>
              <li>Uploading others' IP without permission.</li>
            </ul>
            <p className="mb-4"><strong>Additional ad posting rules:</strong></p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Sellers must be the registered owner of the dogs advertised and hold microchip 
              certificates.</li>
              <li>All dogs must be physically located in Ireland or Northern Ireland.</li>
              <li>Ads with cropped ears are not accepted.</li>
              <li>Docked tails or dew claw removal require veterinary certification under Irish law.</li>
              <li>Stud dogs must be over 12 months old.</li>
              <li>Pregnant or whelping bitches may not be advertised.</li>
              <li>Dogs cannot be listed as "free to a good home."</li>
              <li>DogQuest retains the right to edit listings for clarity and to refuse ads.</li>
              <li>DogQuest may share ad information with authorities in cases of suspected illegal or 
              harmful activity.</li>
           </ul>
          </section>

          {/* Section 12A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">12A. Prohibited Content & Behaviour</h2>
            <p className="mb-4">
              You must not post content or engage in behaviour that is illegal, harassing, defamatory, 
              obscene, hateful, infringes third‑party rights (including IP rights), invades privacy, or 
              otherwise breaches these Terms. DogQuest may suspend, restrict, or terminate accounts for
              serious or repeated violations.
            </p>
            <p>
              <strong>User Conduct in Messages:</strong> Users must remain respectful and avoid harassment, spam, 
              or inappropriate language. DogQuest may restrict access for violations.
            </p>
          </section>

          {/* Section 13 */}
            <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">13. Platform Rights</h2>
            <p className="mb-4">DogQuest may:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>suspend or terminate accounts;</li>
              <li>remove or re-rank listings;</li>
              <li>hold or refund payments during disputes;</li>
              <li>adjust features, fees, or policies (with notice where required).</li>
            </ul>
            <p className="mb-4">
              <strong>Message review clause:</strong> DogQuest may access and disclose platform messages where 
              necessary to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>investigate reports;</li>
              <li>enforce these Terms;</li>
              <li>resolve disputes;</li>
              <li>protect user safety;</li>
              <li>comply with legal obligations.</li>
           </ul>
          </section>

          {/* Section 13A */}
            <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">13A. Service Availability, Maintenance & Changes</h2>
            <p className="mb-4">
              <strong>Service Availability.</strong> We do not guarantee uninterrupted or error‑free operation. Access may
              be suspended or limited for maintenance, updates, security, or events beyond our control.
            </p>
            <p className="mb-4">
              <strong>Changes.</strong> We may modify, add, or remove features or content. Where changes are material 
              and adverse we will provide notice where feasible.
            </p>
            <p>
              <strong>Platform Evolution:</strong> We are continuously improving DogQuest. Features may be added, 
              modified, or removed without prior notice. Where material changes affect your use or 
              rights, we will provide notice where feasible.
            </p>
          </section>

          {/* Section 14 */}
           <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">14. Content Usage</h2>
             <p>
              By submitting ads or content to DogQuest, you grant DogQuest a non-exclusive, perpetual 
              licence to use that content (text, photos, videos) for marketing, promotional purposes, and 
              across DogQuest's website, apps, newsletters, and social media.
            </p>
               </section>

          {/* Section 14B */}
           <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">14B. DogQuest Intellectual Property</h2>
            <p>
              Except for User Content, the Platform and all associated software, designs, trademarks, 
              logos, text, and other proprietary materials are owned by DogQuest or its licensors and are 
              protected by intellectual property laws. You may not copy, modify, distribute, reverse 
              engineer, or create derivative works from our IP without written permission.
            </p>
          </section>

          {/* Section 15 */}
             <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">15. Liability Disclaimer</h2>
            <p className="mb-4">
              <strong>Platform only.</strong> DogQuest is an online marketplace. We do not own, breed, sell, transport, or 
              keep animals.
            </p>
            <p className="mb-4">
              <strong>As-is service.</strong> The Platform is provided "as is" without warranties of any kind.
            </p>
            <p className="mb-4">
              <strong>Health checks.</strong> Vet badges are point-in-time only; buyers remain responsible for 
              independent checks.
            </p>
            <p className="mb-4">
              <strong>Vet liability.</strong> Vet checks are performed by independent vets. Any claims must be taken up 
              directly with the vet.
            </p>
            <p className="mb-4"><strong>Exclusions.</strong> To the fullest extent permitted by law, DogQuest will not be liable for:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>health, genetics, behaviour, or suitability of animals;</li>
              <li>user misstatements or unlawful acts;</li>
              <li>indirect, incidental, or consequential damages;</li>
              <li>loss of profits, goodwill, or data;</li>
              <li>failures caused by third parties or force majeure;</li>
              <li>
                business services, Vet Partner services, product sellers, bookings, treatments, advice,
                communications, fulfilment failures, or disputes arising from business or Vet Partner
                profiles;
              </li>
            </ul>
            <p className="mb-4">
              <strong>Non-excludable rights.</strong> Nothing in these Terms excludes liability that cannot be excluded 
              under Irish or EU law.
            </p>
            <p>
              <strong>Limitation of liability.</strong> If liability cannot be excluded, DogQuest's liability is capped at the 
              lesser of:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>(a) fees you paid to DogQuest in the 6 months before the claim, or</li>
              <li>(b) €100.</li>
           </ul>
          </section>

          {/* Section 15A */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">15A. Third‑Party Services & Links</h2>
            <p>
              The Platform may reference or integrate third‑party services (e.g., payment processors, 
              maps, email). DogQuest does not control and is not responsible for third‑party sites or 
              services. Your use of them is governed by those third parties' terms and policies.
            </p>
          </section>

          {/* Section 16 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">16. Indemnity & Release</h2>
            <p className="mb-4">
              You agree to indemnify and hold harmless DogQuest and its team against claims, damages, 
              costs, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>your listings, content, or transactions;</li>
              <li>your breach of these Terms or the law;</li>
              <li>disputes with other users;</li>
              <li>your infringement of third-party rights;</li>
              <li>actions/omissions of independent vets connected with badges;</li>
              <li>
                your business profile, Vet Partner profile, products, services, advice, bookings,
                fulfilment, customer complaints, regulatory breaches, or disputes with users or third parties;
              </li>
            </ul>
            <p>
              You also release DogQuest from claims arising from disputes between users.
            </p>
          </section>

          {/* Section 17 */}
              <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">17. Dispute Resolution</h2>
            <p className="mb-4">
              <strong>Internal review first:</strong> Email dogquestireland@gmail.com with full details.
            </p>
            <p className="mb-4">
              <strong>Mediation:</strong> If unresolved, both parties agree to attempt mediation (shared cost).
            </p>
            <p className="mb-4">
              <strong>Court:</strong> Only if mediation fails. Claims must be filed within 12 months or be permanently 
              barred.
            </p>
            <p>
              <strong>Class action waiver:</strong> Users agree disputes must be pursued individually, not as group/class 
              claims.
            </p>
          </section>

          {/* Section 18 */}
           <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">18. Governing Law</h2>
            <p>
              These Terms are governed by Irish law. The courts of Ireland have exclusive jurisdiction, 
              subject to mandatory law.
            </p>
           </section>
          
          {/* Section 19 */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">19. Contact</h2>
            <p>
              <strong>Support & General Enquiries:</strong> dogquestireland@gmail.com
            </p>
          </section>
        </div>
      </div>
      {/* Navigation Section */}
      <NavigationSection />
    </>
  );
}
