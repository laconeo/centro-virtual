import React, { useState } from 'react';
import { useLanguage } from '../src/contexts/LanguageContext';
import { Star, CheckCircle } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { UserSession } from '../types';

interface SurveyProps {
  session: UserSession;
  onComplete: () => void;
}

export const SatisfactionSurvey: React.FC<SurveyProps> = ({ session, onComplete }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    // Save to Supabase
    await supabaseService.submitSurvey({
      sesion_id: session.id,
      calificacion: rating,
      comentarios: comment
    });

    setSubmitted(true);
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-[var(--shadow-card)] text-center animate-fade-in">
        <div className="text-[var(--color-primary)] mb-4 flex justify-center">
          <CheckCircle className="w-16 h-16" />
        </div>
        <h2 className="text-2xl mb-2">{t('survey_thanks_title')}</h2>
        <p className="text-gray-500">{t('survey_thanks_desc')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-[var(--shadow-card)] animate-slide-up">
      <h2 className="text-xl font-semibold mb-6 text-center">{t('survey_question')}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`transition-transform hover:scale-110 focus:outline-none ${rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
            >
              <Star className="w-10 h-10 fill-current" />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500">
          {rating === 0 ? t('survey_rating_0') : rating === 5 ? t('survey_rating_5') : rating === 1 ? t('survey_rating_1') : t('survey_rating_thank')}
        </p>

        <textarea
          placeholder={t('survey_placeholder')}
          className="w-full h-24 resize-none"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button
          type="submit"
          disabled={rating === 0}
          className={`btn-primary w-full cursor-pointer ${rating === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {t('survey_submit')}
        </button>
      </form>
    </div>
  );
};