import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class ElectionPaymentService {
  private stripe: Stripe;

  constructor() {
    // Add null check for environment variable
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24.acacia', // Correct API version
    });
  }

  /**
   * Create a payment link for election registration fees
   */
  async createRegistrationPayment(
    electionId: string,
    registrationType: 'voter' | 'candidate',
    amount: number,
    currency: string,
    userData: { userId: string; email?: string; name?: string },
  ) {
    const productName = `${registrationType.charAt(0).toUpperCase() + registrationType.slice(1)} Registration Fee`;
    
    // Create metadata with election-specific info
    const metadata: Record<string, string> = {
      electionId,
      registrationType,
      userId: userData.userId,
      paymentType: 'election_registration',
      amount: amount.toString(),
      currency,
    };

    // Add optional fields if present
    if (userData.email) metadata.email = userData.email;
    if (userData.name) metadata.name = userData.name;

    try {
      // Create a product for this specific election
      const product = await this.stripe.products.create({ 
        name: productName,
        metadata: {
          electionId,
          registrationType,
          paymentType: 'election_registration',
        },
      });

      // Create a price for the product
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: amount * 100, // Convert to cents
        currency,
      });

      // Create the payment link with election-specific options
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata,
        // Fix the custom fields type issue by using proper Stripe types
        custom_fields: [
          {
            key: 'voter_id',
            label: {
              type: 'custom' as const,
              custom: 'Voter/Candidate ID',
            },
            type: 'text',
          },
        ],
        after_completion: {
          type: 'hosted_confirmation',
          hosted_confirmation: {
            custom_message: `Thank you for your payment! Your ${registrationType} registration for the election is being processed.`
          }
        }
      });

      return { 
        url: paymentLink.url, 
        id: paymentLink.id,
        productId: product.id,
        priceId: price.id,
        metadata
      };
    } catch (error) {
      throw new Error(`Election registration payment failed: ${error.message}`);
    }
  }

  /**
   * Get payment status report for an election
   * @param electionId The election ID to get report for
   */
  async getPaymentReport(electionId: string) {
    try {
      // Get all payment links for this election
      const allLinks = await this.stripe.paymentLinks.list({ limit: 100 });
      const electionLinks = allLinks.data.filter(link => 
        link.metadata?.electionId === electionId
      );

      // Get detailed information about payments
      const paymentDetails: Array<{
        userId: string;
        name?: string;
        email?: string;
        registrationType: string;
        status: string;
        paidAt: Date | null;
        amount?: string;
        currency?: string;
        paymentLinkId: string;
      }> = [];
      
      let totalRevenue = 0;
      
      for (const link of electionLinks) {
        const sessions = await this.stripe.checkout.sessions.list({
          payment_link: link.id,
          limit: 10,
        });
        
        // Get the first completed session if any
        const paidSession = sessions.data.find(session => session.status === 'complete');
        
        // Calculate amount if paid
        if (paidSession) {
          const amount = parseFloat(link.metadata?.amount || '0');
          if (!isNaN(amount)) {
            totalRevenue += amount;
          }
        }
        
        paymentDetails.push({
          userId: link.metadata?.userId || '',
          name: link.metadata?.name,
          email: link.metadata?.email,
          registrationType: link.metadata?.registrationType || 'unknown',
          status: paidSession ? 'paid' : 'pending',
          paidAt: paidSession?.created ? new Date(paidSession.created * 1000) : null,
          amount: link.metadata?.amount,
          currency: link.metadata?.currency,
          paymentLinkId: link.id
        });
      }

      // Summarize the report with enhanced statistics
      const summary = {
        electionId,
        totalLinks: electionLinks.length,
        paidCount: paymentDetails.filter(d => d.status === 'paid').length,
        pendingCount: paymentDetails.filter(d => d.status === 'pending').length,
        voterRegistrations: {
          total: paymentDetails.filter(d => d.registrationType === 'voter').length,
          paid: paymentDetails.filter(d => d.registrationType === 'voter' && d.status === 'paid').length,
          pending: paymentDetails.filter(d => d.registrationType === 'voter' && d.status === 'pending').length,
        },
        candidateRegistrations: {
          total: paymentDetails.filter(d => d.registrationType === 'candidate').length,
          paid: paymentDetails.filter(d => d.registrationType === 'candidate' && d.status === 'paid').length,
          pending: paymentDetails.filter(d => d.registrationType === 'candidate' && d.status === 'pending').length,
        },
        totalRevenue,
        currency: paymentDetails.length > 0 ? paymentDetails[0].currency : 'usd',
        paymentDetails
      };

      return summary;
    } catch (error) {
      throw new Error(`Election payment report generation failed: ${error.message}`);
    }
  }

  /**
   * Check if a user has paid for a specific election
   * @param electionId The election ID
   * @param userId The user ID
   * @param type Optional registration type to filter by
   */
  async hasUserPaid(
    electionId: string, 
    userId: string, 
    type?: 'voter' | 'candidate'
  ) {
    try {
      // Get all payment links for this user and election
      const allLinks = await this.stripe.paymentLinks.list({ limit: 100 });
      const userElectionLinks = allLinks.data.filter(link => 
        link.metadata?.electionId === electionId && 
        link.metadata?.userId === userId &&
        (type ? link.metadata?.registrationType === type : true)
      );

      // If no links found, user hasn't attempted payment
      if (userElectionLinks.length === 0) {
        return {
          hasPaid: false,
          reason: 'No payment attempt found'
        };
      }

      // Check if any of the links have been paid
      for (const link of userElectionLinks) {
        const sessions = await this.stripe.checkout.sessions.list({
          payment_link: link.id,
          limit: 10,
        });
        
        const paidSession = sessions.data.find(session => session.status === 'complete');
        if (paidSession) {
          return {
            hasPaid: true,
            paymentInfo: {
              linkId: link.id,
              paidAt: new Date(paidSession.created * 1000),
              registrationType: link.metadata?.registrationType,
              amount: link.metadata?.amount,
              currency: link.metadata?.currency,
            }
          };
        }
      }
      
      // User has links but none are paid
      return {
        hasPaid: false,
        reason: 'Payment pending',
        paymentLinks: userElectionLinks.map(link => ({
          id: link.id,
          url: link.url,
          registrationType: link.metadata?.registrationType,
          createdAt: new Date((link as any).created * 1000 || Date.now())
        }))
      };
    } catch (error) {
      throw new Error(`User payment verification failed: ${error.message}`);
    }
  }


  /**
   * Verify a payment for election participation
   * @param paymentLinkId The payment link ID to verify
   * @param electionId The election ID to verify against
   */
  async verifyPayment(paymentLinkId: string, electionId: string) {
    try {
      const paymentLink = await this.stripe.paymentLinks.retrieve(paymentLinkId);
      
      // Check if this payment is associated with the given election
      if (paymentLink.metadata?.electionId !== electionId) {
        return {
          verified: false,
          reason: 'Payment is not associated with this election',
        };
      }

      // Get the payment link sessions to check if paid
      const sessions = await this.stripe.checkout.sessions.list({
        payment_link: paymentLinkId,
        limit: 10,
      });

      // Check if any session is completed (paid)
      const paidSession = sessions.data.find(session => session.status === 'complete');
      
      return {
        verified: !!paidSession,
        userId: paymentLink.metadata?.userId,
        registrationType: paymentLink.metadata?.registrationType,
        paymentStatus: paidSession ? 'paid' : 'pending',
        paymentDetails: {
          paymentId: paidSession?.id,
          amount: paymentLink.metadata?.amount,
          currency: paymentLink.metadata?.currency,
          paidAt: paidSession?.created ? new Date(paidSession.created * 1000) : null,
          customerEmail: paidSession?.customer_details?.email,
        }
      };
    } catch (error) {
      throw new Error(`Election payment verification failed: ${error.message}`);
    }
  }
  
  /**
   * Generate revenue statistics for elections
   * @param electionIds Optional array of election IDs to filter by
   */
  async getElectionRevenueStats(electionIds?: string[]) {
    try {
      const allLinks = await this.stripe.paymentLinks.list({ limit: 100 });
      
      // Filter links by election IDs if provided, otherwise get all election-related links
      const electionLinks = electionIds 
        ? allLinks.data.filter(link => 
            link.metadata?.paymentType === 'election_registration' && 
            electionIds.includes(link.metadata?.electionId)
          )
        : allLinks.data.filter(link => 
            link.metadata?.paymentType === 'election_registration'
          );

      // Group by election
      const electionMap = new Map();
      
      for (const link of electionLinks) {
        const electionId = link.metadata?.electionId;
        if (!electionId) continue;
        
        if (!electionMap.has(electionId)) {
          electionMap.set(electionId, {
            electionId,
            totalLinks: 0,
            paidLinks: 0,
            revenue: 0,
            voterRevenue: 0,
            candidateRevenue: 0,
            voterCount: 0,
            candidateCount: 0,
            currency: link.metadata?.currency || 'usd'
          });
        }
        
        const electionStats = electionMap.get(electionId);
        electionStats.totalLinks++;
        
        // Check if payment was completed
        const sessions = await this.stripe.checkout.sessions.list({
          payment_link: link.id,
          limit: 10,
        });
        
        const paidSession = sessions.data.find(session => session.status === 'complete');
        if (paidSession) {
          const amount = parseFloat(link.metadata?.amount || '0');
          if (!isNaN(amount)) {
            electionStats.paidLinks++;
            electionStats.revenue += amount;
            
            // Track revenue by registration type
            if (link.metadata?.registrationType === 'voter') {
              electionStats.voterRevenue += amount;
              electionStats.voterCount++;
            } else if (link.metadata?.registrationType === 'candidate') {
              electionStats.candidateRevenue += amount;
              electionStats.candidateCount++;
            }
          }
        }
      }
      
      // Convert map to array
      const stats = Array.from(electionMap.values());
      
      // Calculate overall totals
      const totals = {
        totalElections: stats.length,
        totalRevenue: stats.reduce((sum, stat) => sum + stat.revenue, 0),
        totalVoterRevenue: stats.reduce((sum, stat) => sum + stat.voterRevenue, 0),
        totalCandidateRevenue: stats.reduce((sum, stat) => sum + stat.candidateRevenue, 0),
        totalVoters: stats.reduce((sum, stat) => sum + stat.voterCount, 0),
        totalCandidates: stats.reduce((sum, stat) => sum + stat.candidateCount, 0),
      };
      
      return {
        electionStats: stats,
        totals
      };
    } catch (error) {
      throw new Error(`Election revenue statistics generation failed: ${error.message}`);
    }
  }
}