'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Confetti } from "@/components/ui/confetti";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, RotateCcw, User, Home, ArrowRight, Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import QuizCard from '@/components/quiz/QuizCard';
import QuizOption from '@/components/quiz/QuizOption';
import QuizResult from '@/components/quiz/QuizResult';
import VetPartnerCarousel from '@/components/vet/VetPartnerCarousel';
import { Database } from '@/lib/supabase/types';
import { useToast } from '@/hooks/use-toast';

type AnswerRecord = {
  [key: string]: string | string[];
};

type QuizBreed = Database['public']['Tables']['quiz_breeds']['Row'] & {
  score?: number;
  tier?: 'perfect' | 'tier1' | 'tier2';
};

const questions = [
  {
    id: 'size',
    title: 'What size dog do you prefer?',
    type: 'single',
    options: [
      { value: 'Small',  label: 'Small (Chihuahua, Dachshund, Pomeranian)' },
      { value: 'Medium', label: 'Medium (Beagle, Border Collie, Cocker Spaniel)' },
      { value: 'Large',  label: 'Large (Golden Retriever, German Shepherd, Great Dane)' },
    ]
  },
  {
    id: 'energy',
    title: 'How much energy should your dog have?',
    type: 'single',
    options: [
      { value: 'Low (Calm and relaxed, enjoys lounging)',    label: 'Low (Calm & relaxed)' },
      { value: 'Medium (Balanced energy, loves both playtime and downtime)', label: 'Medium (Regular walks & play)' },
      { value: 'High (Very active, needs lots of exercise and stimulation)',   label: 'High (Lots of exercise & stimulation)' },
    ]
  },
  {
    id: 'grooming',
    title: 'How much grooming are you comfortable with?',
    type: 'single',
    options: [
      { value: 'Minimal (Occasional brushing, low maintenance)',  label: 'Minimal (Occasional brushing)' },
      { value: 'Moderate (Regular brushing, occasional trims)', label: 'Moderate (Regular brushing & trims)' },
      { value: 'High (Frequent grooming, professional grooming required)',     label: 'High (Frequent/professional grooming)' },
    ]
  },
  {
    id: 'beginner_friendly',
    title: 'Does your perfect dog need to be beginner-friendly?',
    type: 'single',
    options: [
      { value: 'Yes', label: 'Yes' },
      { value: 'No',  label: 'No' },
    ]
  },
  {
    id: 'temperament',
    title: (
      <>
        What temperament traits do you prefer? (Select one or <span className="font-bold underline">more</span>)
      </>
    ),
    type: 'multi',
    options: [
      'intelligent','loyal','friendly','playful','calm','protective',
      'independent','water-loving','affectionate','sociable','brave',
      'curious','energetic','gentle'
    ].map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))
  },
  {
    id: 'special_considerations',
    title: (
      <>
        Any special considerations? (Select one or <span className="font-bold underline">more</span>)
      </>
    ),
    type: 'multi',
    options: [
      { value: 'Hypoallergenic',     label: 'Hypoallergenic' },
      { value: 'Good with children', label: 'Good with children' },
      { value: 'Low barking tendency',        label: 'Low barking tendency' },
      { value: 'Good with other pets',     label: 'Good with other pets' },
      { value: 'Protective (guard dog)',         label: 'Protective (guard dog)' },
    ]
  }
];

const Quiz: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [results, setResults] = useState<QuizBreed[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [breedImages, setBreedImages] = useState<Record<string, string>>({});
  const [randomizedResults, setRandomizedResults] = useState<QuizBreed[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Remove the anchor handling since we're using router.push() consistently
  // and the ScrollToTop component will handle proper scroll restoration
  const router = useRouter();
  const { user, role } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      /* session loaded if needed */
    });

    // Check if user just logged in from quiz and has pending quiz answers
    if (typeof window === 'undefined') return;
    
    const pendingQuizAnswers = sessionStorage.getItem('pendingQuizAnswers');
    const fromQuizLogin = sessionStorage.getItem('fromQuizLogin');
    
    if (user && pendingQuizAnswers && fromQuizLogin) {
      // User just logged in from quiz, restore their answers and complete the quiz
      const savedAnswers = JSON.parse(pendingQuizAnswers);
      setAnswers(savedAnswers);
      
      // Clear the session storage
      sessionStorage.removeItem('pendingQuizAnswers');
      sessionStorage.removeItem('fromQuizLogin');
      
      // Complete the quiz with their saved answers
      completeQuizWithSavedAnswers(savedAnswers);
    }
  }, [user]);

  // Fetch breed images when results are available
  useEffect(() => {
    const fetchBreedImages = async () => {
      if (!results || results.length === 0) return;

      try {
        const breedNames = results.map(breed => breed.breed);
        const { data, error } = await supabase
          .from('quiz_breeds')
          .select('breed, image_url')
          .in('breed', breedNames);

        if (error) {
          console.error('Quiz: Error fetching breed images:', error);
          return;
        }

        const imageMap: Record<string, string> = {};
        data?.forEach(breed => {
          if (breed.image_url && breed.image_url.trim() !== '') {
            imageMap[breed.breed] = breed.image_url;

          }
        });

        setBreedImages(imageMap);
      } catch (error) {
        console.error('Quiz: Error fetching breed images:', error);
      }
    };

    if (quizComplete && results.length > 0) {
      fetchBreedImages();
    }
  }, [quizComplete, results]);

  const question = questions[currentQuestion];
  const answerForCurrent = answers[question.id];

  const handleOptionSelect = (value: string) => {
    if (question.type === 'single') {
      setAnswers(a => ({ ...a, [question.id]: value }));
    } else {
      const prev = (answers[question.id] as string[]) || [];
      const next = prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value];
      setAnswers(a => ({ ...a, [question.id]: next }));
    }
  };

  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    
    // Use multiple methods to ensure we get to the top
    // First, prevent any smooth scrolling which can be interrupted
    window.scrollTo(0, 0);
    
    // Use setTimeout to let the DOM update
    setTimeout(() => {
      // Force scroll with zero coordinates (no smooth behavior)
      window.scrollTo(0, 0);
      
      // If we have a ref, also use it (with block:start)
      if (topRef.current) {
        topRef.current.scrollIntoView({ block: 'start' });
      }
      
      // Add one more forced scroll after everything else
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    }, 10);
  };

  const handleNext = async () => {
    if (currentQuestion === questions.length - 1) {
      await completeQuiz();
    } else {
      setCurrentQuestion((i) => i + 1);
      scrollToTop();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) { setCurrentQuestion(i => i - 1); scrollToTop(); }
  };

  const saveQuizResults = async (quizAnswers: AnswerRecord, breedMatches: QuizBreed[]) => {
    // Only save results for authenticated users
    if (!user) {

      return;
    }

    try {
      // Save to quiz_results table
      const { data, error } = await supabase
        .from('quiz_results')
        .insert({
          user_id: user.id,
          quiz_answers: quizAnswers,
          breed_matches: breedMatches
        })
        .select();

      if (error) {
        console.error('Error saving quiz results:', error);
        toast({
          title: "Warning",
          description: "Quiz results could not be saved to your dashboard.",
          variant: "destructive"
        });
      } else {

        // Success toast removed - no longer needed
      }

      // Save breed preferences for alerts
      const breedIds = breedMatches.map(breed => breed.breed);
      
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          breed_ids: breedIds,
          breed_alerts_enabled: true,
          email_notifications_enabled: true,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (preferencesError) {
        console.error('Error saving breed preferences:', preferencesError);
        toast({
          title: "Info",
          description: "Breed alerts have been set up for your matched breeds!",
          duration: Infinity,
        });
      } else {

        toast({
          title: "Breed Alerts Enabled",
          description: "You'll be notified when new listings matching your preferred breeds are added!",
          duration: Infinity,
        });
      }

    } catch (error) {
      console.error('Error saving quiz results:', error);
      toast({
        title: "Warning",
        description: "Quiz results could not be saved to your dashboard.",
        variant: "destructive"
      });
    }
  };

  const completeQuizWithSavedAnswers = async (savedAnswers: AnswerRecord) => {
    scrollToTop();
    setIsSubmitting(true);

    try {
      // gather answers
      const sizeAnswer = savedAnswers.size as string;
      const energyAnswer = savedAnswers.energy as string;
      const groomingAnswer = savedAnswers.grooming as string;
      const beginnerAnswer = savedAnswers.beginner_friendly === 'Yes' ? 'Yes' : 'No';
      const temps = (savedAnswers.temperament as string[]) || [];
      const cons = (savedAnswers.special_considerations as string[]) || [];

      // 1) fetch candidates by size only
      let { data: candidates = [] } = await supabase
        .from('quiz_breeds')
        .select('*')
        .eq('size', sizeAnswer);

      // Ensure candidates is treated as an array even if null
      candidates = candidates || [];

      // 2) full elimination if size-only yields results
      if (candidates.length > 0) {
        const { data: full = [] } = await supabase
          .from('quiz_breeds')
          .select('*')
          .eq('size', sizeAnswer)
          .eq('energy', energyAnswer)
          .eq('grooming', groomingAnswer)
          .eq('beginner_friendly', beginnerAnswer);

        if (full && full.length) {
          candidates = full;
        }
      }

      // If still no candidates, fetch all breeds as fallback
      if (candidates.length === 0) {
        const { data: allBreeds = [] } = await supabase
          .from('quiz_breeds')
          .select('*');
        
        candidates = allBreeds || [];
      }

      // 3) scoring
      const scored = (candidates || [])
        .map(b => ({
          ...b,
          score:
            ((b.temperament as string[]) || []).filter(t => temps.includes(t)).length +
            ((b.special_considerations as string[]) || []).filter(c => cons.includes(c)).length
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      // 4) perfect + two‐tier "closest" with tier assignment
      const perfect = scored.find(b => {
        const breedTemps = (b.temperament as string[]) || [];
        const breedCons  = (b.special_considerations as string[]) || [];
        const hasAnyTemp = temps.some(t => breedTemps.includes(t));
        const hasAnyCons = cons.some(c => breedCons.includes(c));
        return hasAnyTemp && hasAnyCons;
      });

      // Assign tier to perfect match
      if (perfect) {
        (perfect as QuizBreed).tier = 'perfect';
      }

      // Tier 1: other "nearly perfect" = at least one temperament AND one consideration
      let tier1 = scored
        .filter(b => b !== perfect)
        .filter(b => {
          const bt = (b.temperament as string[]) || [];
          const bc = (b.special_considerations as string[]) || [];
          return temps.some(t => bt.includes(t)) && cons.some(c => bc.includes(c));
        })
        .slice(0, 2);

      // Assign tier to tier1 matches
      tier1.forEach(breed => {
        (breed as QuizBreed).tier = 'tier1';
      });

      // Tier 2: if we still need more, score by size/energy/grooming
      let tier2: QuizBreed[] = [];
      if (tier1.length < 2) {
        const needed = 2 - tier1.length;
        // build a list of remaining candidates
        const remaining = scored.filter(b => b !== perfect && !tier1.includes(b));
        // give each a "group match" score for the first three questions
        const groupScored = remaining
          .map(b => ({
            breed: b,
            groupScore:
              (savedAnswers.size === b.size ? 1 : 0) +
              (savedAnswers.energy === b.energy ? 1 : 0) +
              (savedAnswers.grooming === b.grooming ? 1 : 0)
          }))
          .sort((a, z) => z.groupScore - a.groupScore)
          .slice(0, needed)
          .map(x => x.breed);

        tier2 = groupScored;
      }

      // Assign tier to tier2 matches
      tier2.forEach(breed => {
        (breed as QuizBreed).tier = 'tier2';
      });

      // finally, our two "closest" are:
      const closest = [...tier1, ...tier2];

      // 5) final results with randomization
      const resultsWithTiers = perfect ? [perfect, ...closest] : closest;
      const finalResults = randomizeResults(resultsWithTiers);

      setResults(resultsWithTiers);
      setRandomizedResults(finalResults);
      setQuizComplete(true);
      setShowConfetti(true);

      // Save results for all authenticated users (save original with tiers)
      if (user) {

        await saveQuizResults(savedAnswers, resultsWithTiers);
      }

      setTimeout(() => scrollToTop(), 50);
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      console.error('Quiz error:', error);
      toast({
        title: 'Something went wrong',
        description: 'We could not load your breed matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeQuiz = async () => {
    scrollToTop();

    // Check if user is logged in before proceeding
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // gather answers
      const sizeAnswer = answers.size as string;
      const energyAnswer = answers.energy as string;
      const groomingAnswer = answers.grooming as string;
      const beginnerAnswer = answers.beginner_friendly === 'Yes' ? 'Yes' : 'No';
      const temps = (answers.temperament as string[]) || [];
      const cons = (answers.special_considerations as string[]) || [];

      // 1) fetch candidates by size only
      let { data: candidates = [] } = await supabase
        .from('quiz_breeds')
        .select('*')
        .eq('size', sizeAnswer);

      // Ensure candidates is treated as an array even if null
      candidates = candidates || [];

      // 2) full elimination if size-only yields results
      if (candidates.length > 0) {
        const { data: full = [] } = await supabase
          .from('quiz_breeds')
          .select('*')
          .eq('size', sizeAnswer)
          .eq('energy', energyAnswer)
          .eq('grooming', groomingAnswer)
          .eq('beginner_friendly', beginnerAnswer);

        if (full && full.length) {
          candidates = full;
        }
      }

      // If still no candidates, fetch all breeds as fallback
      if (candidates.length === 0) {
        const { data: allBreeds = [] } = await supabase
          .from('quiz_breeds')
          .select('*');
        
        candidates = allBreeds || [];
      }

      // 3) scoring
      const scored = (candidates || [])
        .map(b => ({
          ...b,
          score:
            ((b.temperament as string[]) || []).filter(t => temps.includes(t)).length +
            ((b.special_considerations as string[]) || []).filter(c => cons.includes(c)).length
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      // 4) perfect + two‐tier "closest" with tier assignment
      const perfect = scored.find(b => {
        const breedTemps = (b.temperament as string[]) || [];
        const breedCons  = (b.special_considerations as string[]) || [];
        const hasAnyTemp = temps.some(t => breedTemps.includes(t));
        const hasAnyCons = cons.some(c => breedCons.includes(c));
        return hasAnyTemp && hasAnyCons;
      });

      // Assign tier to perfect match
      if (perfect) {
        (perfect as QuizBreed).tier = 'perfect';
      }

      // Tier 1: other "nearly perfect" = at least one temperament AND one consideration
      let tier1 = scored
        .filter(b => b !== perfect)
        .filter(b => {
          const bt = (b.temperament as string[]) || [];
          const bc = (b.special_considerations as string[]) || [];
          return temps.some(t => bt.includes(t)) && cons.some(c => bc.includes(c));
        })
        .slice(0, 2);

      // Assign tier to tier1 matches
      tier1.forEach(breed => {
        (breed as QuizBreed).tier = 'tier1';
      });

      // Tier 2: if we still need more, score by size/energy/grooming
      let tier2: QuizBreed[] = [];
      if (tier1.length < 2) {
        const needed = 2 - tier1.length;
        // build a list of remaining candidates
        const remaining = scored.filter(b => b !== perfect && !tier1.includes(b));
        // give each a "group match" score for the first three questions
        const groupScored = remaining
          .map(b => ({
            breed: b,
            groupScore:
              (answers.size === b.size ? 1 : 0) +
              (answers.energy === b.energy ? 1 : 0) +
              (answers.grooming === b.grooming ? 1 : 0)
          }))
          .sort((a, z) => z.groupScore - a.groupScore)
          .slice(0, needed)
          .map(x => x.breed);

        tier2 = groupScored;
      }

      // Assign tier to tier2 matches
      tier2.forEach(breed => {
        (breed as QuizBreed).tier = 'tier2';
      });

      // finally, our two "closest" are:
      const closest = [...tier1, ...tier2];

      // 5) final results with randomization
      const resultsWithTiers = perfect ? [perfect, ...closest] : closest;
      const finalResults = randomizeResults(resultsWithTiers);

      setResults(resultsWithTiers);
      setRandomizedResults(finalResults);
      setQuizComplete(true);
      setShowConfetti(true);

      // Save results for all authenticated users (save original with tiers)
      if (user) {

        await saveQuizResults(answers, resultsWithTiers);
      }

      setTimeout(() => scrollToTop(), 50);
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      console.error('Quiz error:', error);
      toast({
        title: 'Something went wrong',
        description: 'We could not load your breed matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fisher-Yates shuffle algorithm for randomization
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Randomize results while maintaining tier order
  const randomizeResults = (breeds: QuizBreed[]): QuizBreed[] => {
    const perfect = breeds.filter(b => b.tier === 'perfect');
    const tier1 = breeds.filter(b => b.tier === 'tier1');
    const tier2 = breeds.filter(b => b.tier === 'tier2');
    
    return [
      ...shuffleArray(perfect),
      ...shuffleArray(tier1),
      ...shuffleArray(tier2)
    ];
  };

  const handleRerollResults = () => {
    const rerolled = randomizeResults(results);
    setRandomizedResults(rerolled);
    toast({
      title: "Results Shuffled!",
      description: "Your breed matches have been randomized within their compatibility tiers.",
    });
  };

  const resetQuiz = () => { 
    setCurrentQuestion(0); 
    setAnswers({}); 
    setQuizComplete(false); 
    setResults([]); 
    setRandomizedResults([]);
    setShowConfetti(false);
    setShowLoginPrompt(false);
    setIsSubmitting(false);
    setBreedImages({});
    scrollToTop();
  };

  const handleLoginRedirect = () => {
    if (typeof window === 'undefined') return;
    
    // Store the quiz answers in session storage so they can be retrieved after login
    sessionStorage.setItem('pendingQuizAnswers', JSON.stringify(answers));
    
    // Store a flag indicating the user came from quiz
    sessionStorage.setItem('fromQuizLogin', 'true');
    
    // Navigate to login page
    router.push('/auth/login');
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat animate-pulseScale"
        style={{
          backgroundImage:
            "url('https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/quiz-page/Dog-Quest-Start-Your-Journey-Quiz.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzRkMzVhZDA5LTkyOTctNGVlOS1iMzZiLWFkNTIyYTViZGE2YSJ9.eyJ1cmwiOiJxdWl6LXBhZ2UvRG9nLVF1ZXN0LVN0YXJ0LVlvdXItSm91cm5leS1RdWl6LnBuZyIsImlhdCI6MTc0ODQ1NjM4OCwiZXhwIjoyMzc5MTc2Mzg4fQ.oEGhiM3_SeZQ1KO8f3RDIe3X771Sp1uAKmfrv7RaPCI')",
        }}
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b"
        style={{
          background: 'linear-gradient(to bottom, rgba(115, 138, 110, 0.9), rgba(115, 138, 110, 0.1))'
        }}
      />
      
      <div className="relative min-h-[calc(100vh-4rem)] p-2 sm:p-4">
        <div
          id="quiz-top"
          ref={topRef}
          className="absolute top-0 left-0 w-full h-0"
          style={{ zIndex: -1 }}
        />
        {showConfetti && <Confetti />}

        {showLoginPrompt ? (
          <div className="max-w-3xl mx-auto p-6 rounded-lg mb-20 bg-transparent">
            <div className="text-center mb-8">
              <h1 className="text-5xl md:text-5xl font-berkshire text-white mt-6 mb-2">
                Almost There!
              </h1>
              <p className="text-lg text-white">
                Create an account to see your personalized breed matches
              </p>
            </div>
            
            <Card className="bg-white/95 backdrop-blur-sm border-blue-200">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-blue-900 mb-3">
                    Sign Up to See Your Results
                  </h3>
                  <p className="text-blue-700 text-lg mb-6">
                    We've analyzed your answers and found your perfect breed matches! 
                    Create a free account to view your results and save them to your dashboard.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={handleLoginRedirect}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                  >
                    Create Account / Log In
                  </Button>
                  <Button 
                    onClick={resetQuiz}
                    variant="outline"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50 px-8 py-3 text-lg"
                  >
                    Retake Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !quizComplete ? (
          <div className="max-w-3xl mx-auto p-3 sm:p-6 rounded-lg bg-transparent">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-5xl sm:text-4xl md:text-5xl font-berkshire text-white mb-2 mt-6">
                Find Your Perfect Match
              </h1>
              <p className="text-base sm:text-lg text-white">
                Answer a few questions to discover the ideal breed for your lifestyle
              </p>
            </div>

            <h2 className="flex items-baseline justify-between text-lg sm:text-xl text-white mb-4">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-xs sm:text-sm text-white">
                {Math.round(progress)}% complete
              </span>
            </h2>

            <div className="mb-6">
              <Progress value={progress} className="h-2" />
            </div>

            <QuizCard question={question.title}>
              {(question.id === 'temperament') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {question.options.map((opt) => (
                    <QuizOption
                      key={opt.value}
                      value={opt.value}
                      label={opt.label}
                      selected={Array.isArray(answerForCurrent)
                        ? answerForCurrent.includes(opt.value)
                        : answerForCurrent === opt.value}
                      onClick={() => handleOptionSelect(opt.value)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {question.options.map((opt) => (
                    <QuizOption
                      key={opt.value}
                      value={opt.value}
                      label={opt.label}
                      selected={Array.isArray(answerForCurrent)
                        ? answerForCurrent.includes(opt.value)
                        : answerForCurrent === opt.value}
                      onClick={() => handleOptionSelect(opt.value)}
                    />
                  ))}
                </div>
              )}
            </QuizCard>

            <div className="flex justify-between mt-6">
              {currentQuestion > 0 && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  className="hover:bg-brand-soft-green hover:text-white border-brand-soft-green text-brand-soft-green"
                >
                  <ChevronLeft className="mr-1" /> Back
                </Button>
              )}
              <Button
                onClick={() => void handleNext()}
                disabled={
                  isSubmitting ||
                  !answerForCurrent ||
                  (question.type === 'multi' &&
                    Array.isArray(answerForCurrent) &&
                    answerForCurrent.length === 0)
                }
                className="ml-auto bg-brand-soft-green hover:bg-brand-dark-green border border-white text-white hover:border hover:border-white"
                size="sm"
              >
                {isSubmitting && currentQuestion === questions.length - 1 ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Finding matches...
                  </>
                ) : (
                  <>
                    {currentQuestion === questions.length - 1 ? 'See Results' : 'Next'}
                    <ChevronRight className="ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6 rounded-lg mb-20 bg-transparent">
            <div className="text-center mb-8">
              <h1 className="text-5xl md:text-5xl font-berkshire text-white mt-6 mb-2">
                Your Quiz Results
              </h1>
              <p className="text-lg text-white">
                Based on your preferences, we've found some perfect matches
              </p>
            </div>
            <QuizResult
              matches={randomizedResults.length > 0 ? randomizedResults : results}
              isLoggedIn={!!user}
              onSeeListings={(path: string) => router.push(path)}
              onBrowseBreeds={() => router.push('/breeds')}
              breedImages={breedImages}
              onRerollResults={handleRerollResults}
            />
            <div className="mt-8 text-center">
              <Button onClick={resetQuiz} variant="outline" className="flex items-center">
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake Quiz
              </Button>
            </div>
            
            {/* Vet Partner Carousel */}
            <div className="mt-12">
              <VetPartnerCarousel
                title="DogQuest Vet Partners Near Me"
                maxItems={10}
                showSeeAll={true}
                paidFirst={true}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Continue Your Journey section for Quiz page */}
      <section className="w-full bg-[#E1E8E0] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-berkshire text-brand-dark-green mb-3">
                Continue Your Journey
              </h2>
              <p className="text-gray-700 mb-6 max-w-xl">
                Discover more ways to find your perfect dog companion or explore our services.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-brand-dark-green hover:bg-brand-soft-green px-6">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Return Home
                </Link>
              </Button>
              <Button 
                onClick={() => router.push('/breeds')} 
                className="bg-brand-soft-green hover:bg-brand-dark-green px-6 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                View All Breeds
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Quiz;
