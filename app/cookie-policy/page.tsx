'use client';

import React from 'react';
import NavigationSection from '@/components/NavigationSection';
import { CONTACT_EMAIL, CONTACT_MAILTO_HREF } from '@/lib/config/contact';

export default function CookiePolicy() {
  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-berkshire text-gray-800 mb-6">Cookie Policy</h1>
          
          <div className="prose prose-lg max-w-none space-y-6">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString('en-IE', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
                They are widely used to make websites work more efficiently and to provide information to website owners.
              </p>
              <p className="text-gray-700">
                Dog Quest uses cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                This Cookie Policy explains what cookies we use and how you can control them.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">Types of Cookies We Use</h2>
              
              <div className="space-y-6">
                <div className="border-l-4 border-brand-light-green pl-4">
                  <h3 className="text-xl font-semibold mb-2">Essential Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies are necessary for the website to function properly. They enable core functionality 
                    such as security, network management, and accessibility.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 ml-4">
                    <li>Authentication cookies to keep you logged in</li>
                    <li>Security cookies to protect against fraud</li>
                    <li>Load balancing cookies to distribute traffic</li>
                    <li>Cookie consent preferences</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Legal basis:</strong> Legitimate interest - these cookies are essential for website operation.
                  </p>
                </div>

                <div className="border-l-4 border-brand-soft-green pl-4">
                  <h3 className="text-xl font-semibold mb-2">Functional Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies enhance the functionality of the website by remembering your preferences and choices.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 ml-4">
                    <li>Language preferences</li>
                    <li>Search filters and sorting preferences</li>
                    <li>Currency selection</li>
                    <li>Wishlist items for guest users</li>
                    <li>Form data to prevent loss during navigation</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Legal basis:</strong> Consent - these cookies improve your user experience.
                  </p>
                </div>

                <div className="border-l-4 border-brand-dark-green pl-4">
                  <h3 className="text-xl font-semibold mb-2">Analytics Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies help us understand how visitors interact with our website by collecting and 
                    reporting information anonymously.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 ml-4">
                    <li>Google Analytics cookies to track website usage</li>
                    <li>Page view statistics</li>
                    <li>User journey analysis</li>
                    <li>Performance monitoring</li>
                    <li>Error tracking and debugging</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Legal basis:</strong> Consent - these cookies help us improve our website.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="text-xl font-semibold mb-2">Marketing Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies are used to track visitors across websites to display relevant advertisements 
                    and measure the effectiveness of advertising campaigns.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 ml-4">
                    <li>Social media platform cookies (Facebook, Instagram)</li>
                    <li>Advertising network cookies</li>
                    <li>Retargeting cookies for personalized ads</li>
                    <li>Campaign tracking cookies</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Legal basis:</strong> Consent - these cookies require your explicit permission.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                We work with trusted third-party service providers who may also set cookies on your device. 
                These include:
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Privacy Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Google Analytics</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Website analytics and performance tracking</td>
                      <td className="px-6 py-4 text-sm">
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" 
                           className="text-brand-soft-green hover:text-brand-dark-green">
                          Google Privacy Policy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Supabase</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Authentication and database services</td>
                      <td className="px-6 py-4 text-sm">
                        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" 
                           className="text-brand-soft-green hover:text-brand-dark-green">
                          Supabase Privacy Policy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Stripe</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Payment processing</td>
                      <td className="px-6 py-4 text-sm">
                        <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" 
                           className="text-brand-soft-green hover:text-brand-dark-green">
                          Stripe Privacy Policy
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">How to Control Cookies</h2>
              <p className="text-gray-700 mb-4">
                You have several options to control or limit how we and our partners use cookies and similar technologies:
              </p>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-dark-green mb-2">Cookie Consent Banner</h3>
                  <p className="text-gray-700">
                    When you first visit our website, you'll see a cookie consent banner. You can choose to accept all cookies, 
                    reject non-essential cookies, or customize your preferences.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-dark-green mb-2">Browser Settings</h3>
                  <p className="text-gray-700 mb-2">
                    Most web browsers allow you to control cookies through their settings. You can:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 ml-4">
                    <li>Block all cookies</li>
                    <li>Block third-party cookies</li>
                    <li>Delete cookies when you close your browser</li>
                    <li>Get a warning before a cookie is stored</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-dark-green mb-2">Opt-Out Tools</h3>
                  <p className="text-gray-700 mb-2">
                    You can opt out of specific services:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 ml-4">
                    <li>
                      <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" 
                         className="text-brand-soft-green hover:text-brand-dark-green">
                        Google Analytics Opt-out Browser Add-on
                      </a>
                    </li>
                    <li>
                      <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" 
                         className="text-brand-soft-green hover:text-brand-dark-green">
                        Your Online Choices (EU)
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg mt-4">
                <p className="text-gray-700">
                  <strong>Please note:</strong> Disabling certain cookies may affect the functionality of our website. 
                  Essential cookies cannot be disabled as they are necessary for the website to function properly.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">Cookie Retention</h2>
              <p className="text-gray-700 mb-4">
                Different cookies have different lifespans:
              </p>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Session Cookies</span>
                  <span className="text-gray-600">Deleted when you close your browser</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Authentication Cookies</span>
                  <span className="text-gray-600">30 days</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Preference Cookies</span>
                  <span className="text-gray-600">1 year</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Analytics Cookies</span>
                  <span className="text-gray-600">2 years</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Marketing Cookies</span>
                  <span className="text-gray-600">Up to 2 years</span>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">Children's Privacy</h2>
              <p className="text-gray-700">
                Our website is not intended for children under 16 years of age. We do not knowingly collect personal 
                information or use cookies to track children under 16. If you are a parent or guardian and believe 
                your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">Changes to This Cookie Policy</h2>
              <p className="text-gray-700">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other 
                operational, legal, or regulatory reasons. We will notify you of any material changes by posting the 
                new Cookie Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Cookie Policy or our use of cookies, please contact us:
              </p>
              
              <div className="bg-brand-light-green/10 p-4 rounded-lg">
                <ul className="space-y-2 text-gray-700">
                  <li>
                    <strong>Email:</strong>{' '}
                    <a href={CONTACT_MAILTO_HREF} className="text-brand-dark-green hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                  </li>
                  <li><strong>Address:</strong> Dog Quest Ireland, Deegerty, Askeaton, Co. Limerick V94PCD4 </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-dark-green mb-4">Your Rights Under GDPR</h2>
              <p className="text-gray-700 mb-4">
                Under the General Data Protection Regulation (GDPR), you have the following rights regarding cookies 
                and your personal data:
              </p>
              
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Right to be informed:</strong> This policy informs you about our cookie usage</li>
                <li><strong>Right of access:</strong> You can request information about the cookies we use</li>
                <li><strong>Right to rectification:</strong> You can correct any inaccurate information</li>
                <li><strong>Right to erasure:</strong> You can request deletion of your data and cookies</li>
                <li><strong>Right to restrict processing:</strong> You can limit how we use your data</li>
                <li><strong>Right to data portability:</strong> You can request your data in a portable format</li>
                <li><strong>Right to object:</strong> You can object to certain types of cookie usage</li>
                <li><strong>Right to withdraw consent:</strong> You can withdraw your consent at any time</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    {/* Navigation Section - Using the reusable component */}
      <NavigationSection />
    </>
  );
}

