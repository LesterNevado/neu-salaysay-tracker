
/**
 * Determines the most likely violation type based on the excuse description
 * Supports both English and Tagalog text
 * 
 * @param excuseText The text from the natureOfExcuse field
 * @returns The determined violation type
 */
export function determineViolationType(excuseText?: string): string {
  if (!excuseText) return "Other";
  
  const normalizedText = excuseText.toLowerCase();
  
  // Medical-related terms in both English and Tagalog
  const medicalKeywords = [
    // English
    'sick', 'illness', 'hospital', 'doctor', 'medical', 'clinic', 'health', 'disease', 
    'fever', 'flu', 'cough', 'cold', 'headache', 'pain', 'surgery', 'appointment',
    'prescription', 'medication', 'treatment', 'emergency', 'injury', 'wounds',
    // Tagalog
    'sakit', 'karamdaman', 'ospital', 'doktor', 'medikal', 'klinika', 'kalusugan', 
    'lagnat', 'sipon', 'ubo', 'sakit ng ulo', 'masakit', 'operasyon', 'gamot',
    'reseta', 'paggamot', 'kagipitan', 'pinsala', 'sugat', 'pagkakasakit',
    'nagkasakit', 'nagpagamot', 'nagpatingin', 'nagpacheck-up'
  ];
  
  // Family/Personal emergency terms in both English and Tagalog
  const emergencyKeywords = [
    // English
    'emergency', 'urgent', 'family', 'death', 'funeral', 'accident', 'crisis',
    'relative', 'parent', 'child', 'mother', 'father', 'grandparent', 'sibling',
    // Tagalog
    'kagipitan', 'agarang', 'pamilya', 'kamatayan', 'libing', 'aksidente', 'krisis',
    'kamag-anak', 'magulang', 'anak', 'nanay', 'tatay', 'lola', 'lolo', 'kapatid',
    'pumanaw', 'pagpanaw', 'namatay', 'naaksidente', 'pumanaw', 'yumao'
  ];
  
  // Transportation/late terms in both English and Tagalog
  const transportKeywords = [
    // English
    'late', 'traffic', 'transportation', 'commute', 'bus', 'train', 'car', 'vehicle',
    'breakdown', 'delay', 'missed', 'schedule', 'transport',
    // Tagalog
    'huli', 'late', 'trapik', 'transportasyon', 'biyahe', 'bus', 'tren', 'kotse', 'sasakyan',
    'nasira', 'naantala', 'nawala', 'iskedyul', 'nawalan', 'naantalang biyahe',
    'nahuli', 'naabutan ng trapik', 'traffic', 'nasiraan', 'nasiraan ng sasakyan'
  ];
  
  // Uniform/dress code terms in both English and Tagalog
  const dressCodeKeywords = [
    // English
    'uniform', 'dress code', 'clothes', 'attire', 'outfit', 'wear', 'shirt', 'pants',
    'skirt', 'blouse', 'jacket', 'shoes', 'socks', 'hat', 'cap', 'dress',
    // Tagalog
    'uniporme', 'kasuotan', 'damit', 'pananamit', 'suot', 'kasuotang', 'pang-itaas',
    'pantalon', 'palda', 'sapatos', 'medyas', 'sumbrero', 'bestida', 'pang-ibaba',
    'hindi nakasuot', 'hindi nakapagsuot', 'hindi nakapagsapatos', 'nagkamali ng suot'
  ];
  
  // Behavior/Conduct terms in both English and Tagalog
  const behaviorKeywords = [
    // English
    'behavior', 'conduct', 'attitude', 'disrespect', 'misbehavior', 'misconduct',
    'discipline', 'action', 'offense', 'violation', 'rule', 'policy',
    // Tagalog
    'asal', 'kilos', 'ugali', 'kawalan ng respeto', 'maling asal', 'maling kilos',
    'disiplina', 'aksyon', 'paglabag', 'patakaran', 'alituntunin', 'regulasyon',
    'pagkakasala', 'pagsuway', 'hindi nasunod', 'hindi sinunod', 'nagawang pagkakasala',
    'pagkakamali', 'kasalanan', 'pagkukulang', 'pagkakasala'
  ];
  
  // Academic-related terms in both English and Tagalog
  const academicKeywords = [
    // English
    'homework', 'assignment', 'project', 'exam', 'test', 'quiz', 'class', 'course',
    'subject', 'study', 'academic', 'research', 'paper', 'report', 'presentation',
    // Tagalog
    'takdang-aralin', 'takdang aralin', 'assignment', 'proyekto', 'pagsusulit', 'eksamen', 
    'klase', 'kurso', 'asignatura', 'aralin', 'pag-aaral', 'akademiko', 'pananaliksik', 
    'papel', 'ulat', 'presentasyon', 'hindi nakapasa', 'hindi nakagawa', 'hindi natapos',
    'hindi nakapagsumite', 'hindi nakapagpasa'
  ];
  
  // Count occurrences of keywords in each category
  let medicalCount = medicalKeywords.filter(keyword => normalizedText.includes(keyword)).length;
  let emergencyCount = emergencyKeywords.filter(keyword => normalizedText.includes(keyword)).length;
  let transportCount = transportKeywords.filter(keyword => normalizedText.includes(keyword)).length;
  let dressCodeCount = dressCodeKeywords.filter(keyword => normalizedText.includes(keyword)).length;
  let behaviorCount = behaviorKeywords.filter(keyword => normalizedText.includes(keyword)).length;
  let academicCount = academicKeywords.filter(keyword => normalizedText.includes(keyword)).length;
  
  // Enhanced detection for Tagalog excuses
  // Specific checks for common Tagalog expressions that indicate behavioral issues
  if (normalizedText.includes('pagkakasala') || 
      normalizedText.includes('kasalanan') || 
      normalizedText.includes('nagawang pagkakamali') ||
      normalizedText.includes('hindi sumunod') ||
      normalizedText.includes('paglabag sa alituntunin')) {
    behaviorCount += 3; // Strongly weight these specific phrases
  }
  
  // Find the category with the highest count
  const counts = [
    { type: "Medical Excuse", count: medicalCount },
    { type: "Family Emergency", count: emergencyCount },
    { type: "Tardiness", count: transportCount },
    { type: "Dress Code Violation", count: dressCodeCount },
    { type: "Behavioral Issue", count: behaviorCount },
    { type: "Academic Violation", count: academicCount }
  ];
  
  counts.sort((a, b) => b.count - a.count);
  
  // If the highest has at least one hit and is greater than the runner-up, return it
  if (counts[0].count > 0 && (counts.length < 2 || counts[0].count > counts[1].count)) {
    return counts[0].type;
  }
  
  // Default fallback if no clear category is determined
  return "Other";
}
