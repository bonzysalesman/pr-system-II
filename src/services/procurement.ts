import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { User } from '@/types/user';

/**
 * Gets the emails of all procurement team members
 * 
 * @returns Array of procurement team email addresses
 */
export async function getProcurementTeamEmails(): Promise<string[]> {
  try {
    // Query for users with PROC permission level (Procurement Officers)
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('permissionLevel', '==', 3), // Level 3 = Procurement Officer
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Extract emails from the user documents
    const emails: string[] = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as User;
      if (userData.email) {
        emails.push(userData.email);
      }
    });
    
    // If no procurement officers found, return a fallback email
    if (emails.length === 0) {
      console.warn('No procurement team members found, using fallback email');
      return ['procurement@1pwrafrica.com'];
    }
    
    return emails;
  } catch (error) {
    console.error('Error getting procurement team emails:', error);
    // Return a fallback email in case of error
    return ['procurement@1pwrafrica.com'];
  }
}

/**
 * Gets the procurement team members
 * 
 * @returns Array of procurement team member User objects
 */
export async function getProcurementTeamMembers(): Promise<User[]> {
  try {
    // Query for users with PROC permission level (Procurement Officers)
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('permissionLevel', '==', 3), // Level 3 = Procurement Officer
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Extract user data from the documents
    const procurementTeam: User[] = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as User;
      procurementTeam.push({
        ...userData,
        id: doc.id
      });
    });
    
    return procurementTeam;
  } catch (error) {
    console.error('Error getting procurement team members:', error);
    return [];
  }
}
