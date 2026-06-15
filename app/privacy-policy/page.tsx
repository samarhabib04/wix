'use client';

import React from 'react';
import Link from 'next/link';
import NavigationSection from '@/components/NavigationSection';
import { CONTACT_EMAIL, CONTACT_MAILTO_HREF } from '@/lib/config/contact';

export default function PrivacyPolicy() {
  return (
    <>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl font-berkshire text-gray-800 mb-6">Privacy Policy</h1>
        
        <div className="prose prose-green max-w-none">
          <p className="text-lg mb-6">
            Dog Quest is committed to protecting your privacy and personal data. This policy explains how we collect, 
            use, process, and protect your information when you use our platform, in compliance with the General Data 
            Protection Regulation (GDPR) and Irish data protection laws.
          </p>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Data Controller Information</h2>
            <p>
              Dog Quest operates as the data controller for personal information collected through our platform. 
              We are based in Ireland and subject to Irish and EU data protection laws.
            </p>
            <p className="mt-2">
              <strong>Contact Information:</strong><br />
              Email:{' '}
              <a href={CONTACT_MAILTO_HREF} className="text-brand-dark-green hover:underline">
                {CONTACT_EMAIL}
              </a>
              <br />
              Website: <a href="https://dogquest.ie" className="text-brand-dark-green hover:underline">dogquest.ie</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Account and Profile Information</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Registration Data:</strong> Name, email address, phone number, location (county), and password</li>
              <li><strong>Google OAuth Data:</strong> If you sign in with Google, we collect your Google profile information including name, email, and profile picture</li>
              <li><strong>User Role:</strong> Whether you're registered as a buyer, seller, business, or admin</li>
              <li><strong>Business Information:</strong> For business accounts, we collect business name, address, description, and verification details</li>
              <li><strong>Profile Enhancements:</strong> Avatar images, seller IDs, and other profile customizations</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Listing and Transaction Data</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Pet Listings:</strong> Photos, descriptions, breed information, health records, family tree data, and pricing</li>
              <li><strong>Messages:</strong> Communications between buyers and sellers through our messaging system</li>
              <li><strong>Reviews and Ratings:</strong> Feedback you provide about sellers, businesses, or transactions</li>
              <li><strong>Purchase History:</strong> Records of shop purchases and payment information (processed by Stripe)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Technical and Analytics Data</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
              <li><strong>Usage Analytics:</strong> Page views, time spent on site, search queries, and user interactions</li>
              <li><strong>Quiz Data:</strong> Responses to our breed compatibility quiz and calculated breed matches</li>
              <li><strong>Location Data:</strong> Approximate location for showing relevant listings and services</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies, analytics cookies, and preference cookies</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Verification Data</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Phone Verification:</strong> Phone numbers and verification codes (automatically deleted after verification)</li>
              <li><strong>Health Certificates:</strong> Veterinary documentation and health clearances for listed animals</li>
              <li><strong>Identity Verification:</strong> Documentation to verify seller authenticity and business registration</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">How We Use Your Information</h2>
            <p>We process your personal data for the following purposes under various lawful bases:</p>
            
            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Contract Performance</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Creating and managing user accounts</li>
              <li>Facilitating connections between buyers and sellers</li>
              <li>Processing transactions and payments</li>
              <li>Providing customer support and resolving disputes</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Legitimate Interest</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Improving platform functionality and user experience</li>
              <li>Preventing fraud and ensuring platform security</li>
              <li>Analyzing usage patterns to optimize our services</li>
              <li>Personalizing content and recommendations</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Consent</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Sending marketing communications (newsletter subscription)</li>
              <li>Using analytics cookies and tracking technologies</li>
              <li>Processing location data for enhanced services</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Legal Compliance</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Complying with animal welfare and trading regulations</li>
              <li>Maintaining records for tax and accounting purposes</li>
              <li>Responding to legal requests and court orders</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Third-Party Services and Data Sharing</h2>
            <p>
              We work with trusted third-party service providers to operate our platform. We only share data 
              necessary for these services and ensure they meet our privacy and security standards.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Essential Service Providers</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase:</strong> Database hosting, authentication, and file storage (EU-based infrastructure)</li>
              <li><strong>Stripe:</strong> Payment processing for shop purchases (PCI DSS compliant)</li>
              <li><strong>Google OAuth:</strong> Secure authentication option for user convenience</li>
              <li><strong>Twilio:</strong> SMS verification for phone number validation</li>
              <li><strong>Resend:</strong> Transactional email delivery (account notifications, password resets)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Analytics and Marketing</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Google Analytics:</strong> Website usage analytics with IP anonymization enabled</li>
              <li><strong>Cloudflare:</strong> Content delivery network and security services</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Public Information</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Published pet listings and seller profiles are visible to all platform users</li>
              <li>Business listings appear in our public directory</li>
              <li>User reviews and ratings are publicly displayed</li>
              <li>Quiz results remain private unless you choose to share them</li>
            </ul>

            <p className="mt-4">
              <strong>We never sell your personal information to third parties.</strong> We may share anonymized, 
              aggregate data that cannot identify individuals for research and industry insights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Cookies and Tracking Technologies</h2>
            <p>
              We use various types of cookies and similar technologies to enhance your browsing experience 
              and understand how you interact with our platform.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Types of Cookies We Use</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Essential Cookies:</strong> Required for login, security, and basic site functionality</li>
              <li><strong>Analytics Cookies:</strong> Google Analytics cookies to understand site usage and performance</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences across sessions</li>
              <li><strong>Authentication Cookies:</strong> Supabase session cookies to keep you logged in securely</li>
              <li><strong>Performance Cookies:</strong> Cloudflare cookies for site optimization and security</li>
            </ul>

            <p className="mt-4">
              You can manage your cookie preferences through our cookie banner or your browser settings. 
              Note that disabling certain cookies may affect site functionality. For more details, see our 
              <Link href="/cookie-policy" className="text-brand-dark-green hover:underline ml-1">Cookie Policy</Link>.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Data Retention and Storage</h2>
            <p>
              We retain your personal information only as long as necessary to fulfill the purposes outlined 
              in this privacy policy or as required by law.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Retention Periods</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account Information:</strong> Retained until you delete your account or request deletion</li>
              <li><strong>Pet Listings:</strong> Kept active until removed by seller or upon account deletion</li>
              <li><strong>Messages:</strong> Stored for dispute resolution purposes, with automatic cleanup after 7 years</li>
              <li><strong>Transaction Records:</strong> Maintained for 7 years to comply with tax and accounting requirements</li>
              <li><strong>Phone Verification Codes:</strong> Automatically deleted after verification or expiration</li>
              <li><strong>Quiz Results:</strong> Stored indefinitely until you delete them or close your account</li>
              <li><strong>Analytics Data:</strong> Google Analytics data retained for 26 months, then automatically deleted</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Data Storage Locations</h3>
            <p>
              Your data is primarily stored within the European Union through our Supabase infrastructure. 
              Some third-party services may process data outside the EU, but only under appropriate safeguards 
              such as Standard Contractual Clauses or adequacy decisions.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Your Rights Under GDPR</h2>
            <p>
              As an individual in the European Economic Area (EEA), you have the following rights regarding 
              your personal data:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Right of Access:</strong> Request copies of your personal information and details about how we process it</li>
              <li><strong>Right to Rectification:</strong> Ask us to correct inaccurate or incomplete information</li>
              <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your personal data in certain circumstances</li>
              <li><strong>Right to Restrict Processing:</strong> Ask us to limit how we use your data in specific situations</li>
              <li><strong>Right to Data Portability:</strong> Request transfer of your data to another service in a machine-readable format</li>
              <li><strong>Right to Object:</strong> Oppose our processing of your data, particularly for marketing purposes</li>
              <li><strong>Right to Withdraw Consent:</strong> Remove consent for data processing that relies on your consent</li>
              <li><strong>Right to Lodge a Complaint:</strong> File a complaint with the Irish Data Protection Commission or your local supervisory authority</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us using the details below. We will respond to your 
              request within one month and provide the requested information free of charge in most cases.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Data Security and Protection</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data 
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Security Measures</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Encryption:</strong> Data transmission encrypted using TLS/SSL protocols</li>
              <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication for admin accounts</li>
              <li><strong>Database Security:</strong> Row-level security policies and encrypted data storage</li>
              <li><strong>Payment Security:</strong> PCI DSS compliant payment processing through Stripe</li>
              <li><strong>Regular Audits:</strong> Ongoing security assessments and vulnerability testing</li>
              <li><strong>Staff Training:</strong> Regular privacy and security training for all team members</li>
            </ul>

            <p className="mt-4">
              Despite these measures, no system is completely secure. If you become aware of any security 
              vulnerability, please report it to us immediately at 
              <a href={CONTACT_MAILTO_HREF} className="text-brand-dark-green hover:underline ml-1">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Children's Privacy</h2>
            <p>
              Children under 16 must be accompanied by an adult. We do not knowingly 
              collect personal information from children under 16 without parental consent. If we become aware that we have collected 
              personal information from a child under 16 without proper consent, we will take steps to delete that information promptly.
            </p>
            <p className="mt-2">
              If you are a parent or guardian and believe your child has provided us with personal information, 
              please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">International Data Transfers</h2>
            <p>
              While we primarily store data within the EU, some of our service providers may process data 
              outside the European Economic Area. When this occurs, we ensure appropriate safeguards are in place:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Standard Contractual Clauses approved by the European Commission</li>
              <li>Adequacy decisions recognizing equivalent data protection standards</li>
              <li>Binding Corporate Rules for multinational service providers</li>
              <li>Explicit consent where required by law</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Changes to This Privacy Policy</h2>
            <p>
              We may update this privacy policy from time to time to reflect changes in our practices, 
              technology, legal requirements, or other factors. We will notify you of any material changes by:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Posting the updated policy on this page with a new effective date</li>
              <li>Sending email notifications to registered users for significant changes</li>
              <li>Displaying prominent notices on our website</li>
            </ul>
            <p className="mt-2">
              We encourage you to review this privacy policy periodically to stay informed about how we 
              protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this privacy policy or our data 
              practices, please contact us:
            </p>
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p>
                <strong>Email:</strong>{' '}
                <a href={CONTACT_MAILTO_HREF} className="text-brand-dark-green hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p><strong>Website:</strong> <a href="https://dogquest.ie" className="text-brand-dark-green hover:underline">dogquest.ie</a></p>
              <p><strong>Response Time:</strong> We aim to respond to all privacy-related inquiries within 48 hours</p>
            </div>
            
            <p className="mt-4">
              <strong>Data Protection Authority:</strong><br />
              If you are not satisfied with our response, you have the right to lodge a complaint with the 
              <a href="https://www.dataprotection.ie/" target="_blank" rel="noopener noreferrer" className="text-brand-dark-green hover:underline ml-1">
                Irish Data Protection Commission
              </a> or your local supervisory authority.
            </p>
          </section>
          
          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-gray-600">
              <strong>Last updated:</strong> December 14, 2024<br />
              <strong>Effective date:</strong> December 14, 2024<br />
              <strong>Version:</strong> 2.0
            </p>
          </div>
        </div>
      </div>
      {/* Navigation Section - Using the reusable component */}
      <NavigationSection />
    </>
  );
}

