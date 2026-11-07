import { LEVEL_DATA } from '../data/levels.js';
import { Icons } from './Icons.js';

export class LevelSelectScreen {
  constructor({ container, storageService, audioService, onSelectLevel, onBack }) {
    this.container = container || document.getElementById('levelSelectScreen');
    this.storage = storageService;
    this.audio = audioService;
    this.onSelectLevel = onSelectLevel;
    this.onBack = onBack;

    this.backBtn = document.getElementById('btnLevelSelectBack');
    this.progressBadge = document.getElementById('levelSelectProgressBadge');
    this.tabsContainer = document.getElementById('levelSelectTabs');
    this.contentContainer = document.getElementById('levelSelectContent');
    this.scrollArea = document.getElementById('levelSelectScroll');
    this.toastEl = document.getElementById('levelSelectToast');

    this.activeFilter = 'ALL';
    this.toastTimer = null;

    this.initEvents();
  }

  initEvents() {
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        if (this.onBack) this.onBack();
      });
    }

    if (this.tabsContainer) {
      this.tabsContainer.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          this.tabsContainer.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }
  }

  showToast(message) {
    if (!this.toastEl) return;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastEl.textContent = message;
    this.toastEl.classList.add('active');
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('active');
    }, 2200);
  }

  render() {
    if (!this.contentContainer) return;

    const completedCount = this.storage ? this.storage.getCompletedLevelsCount() : 0;
    const currentIdx = this.storage ? this.storage.getCurrentLevel() : 0;
    const totalLevels = LEVEL_DATA.length;

    // 1. Update Header Progress Badge
    if (this.progressBadge) {
      this.progressBadge.textContent = `${completedCount} / ${totalLevels} SOLVED`;
    }

    // 2. Compute Category Tab Counts
    const categoryTabs = [
      { id: 'ALL', label: 'ALL', count: totalLevels },
      { id: 'Quotes', label: 'QUOTES', count: LEVEL_DATA.filter(l => (l.category || 'Quotes') === 'Quotes').length },
      { id: 'Proverbs', label: 'PROVERBS', count: LEVEL_DATA.filter(l => l.category === 'Proverbs').length },
      { id: 'Riddles', label: 'RIDDLES', count: LEVEL_DATA.filter(l => l.category === 'Riddles').length },
      { id: 'Movie Lines', label: 'MOVIE LINES', count: LEVEL_DATA.filter(l => l.category === 'Movie Lines').length },
      { id: 'Trivia', label: 'TRIVIA', count: LEVEL_DATA.filter(l => l.category === 'Trivia').length },
      { id: 'Wordplay', label: 'WORDPLAY', count: LEVEL_DATA.filter(l => l.category === 'Wordplay').length },
      { id: 'Jokes', label: 'JOKES', count: LEVEL_DATA.filter(l => l.category === 'Jokes').length }
    ];

    // 3. Render Category Filter Tabs
    if (this.tabsContainer) {
      this.tabsContainer.innerHTML = categoryTabs.map(t => `
        <button class="tier-tab-btn ${this.activeFilter === t.id ? 'active' : ''}" data-cat="${t.id}">
          <span>${t.label}</span>
          <span class="tier-tab-count">(${t.count})</span>
        </button>
      `).join('');

      this.tabsContainer.querySelectorAll('.tier-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-cat');
          if (this.activeFilter !== cat) {
            this.activeFilter = cat;
            if (this.audio) this.audio.playClick();
            this.render();
          }
        });
      });
    }

    // 4. Define Sections Metadata
    const sectionsMeta = [
      {
        id: 'Quotes-Beginner',
        category: 'Quotes',
        label: 'QUOTES — BEGINNER',
        meta: 'DIFF 1.0 – 45.0',
        filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 1: Beginner'
      },
      {
        id: 'Quotes-Intermediate',
        category: 'Quotes',
        label: 'QUOTES — INTERMEDIATE',
        meta: 'DIFF 45.1 – 65.0',
        filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 2: Intermediate'
      },
      {
        id: 'Quotes-Advanced',
        category: 'Quotes',
        label: 'QUOTES — ADVANCED',
        meta: 'DIFF 65.1 – 80.0',
        filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 3: Advanced'
      },
      {
        id: 'Quotes-Master',
        category: 'Quotes',
        label: 'QUOTES — MASTER',
        meta: 'DIFF 80.1 – 99.0',
        filter: l => (l.category || 'Quotes') === 'Quotes' && l.tier === 'Tier 4: Master'
      },
      {
        id: 'Proverbs-Beginner',
        category: 'Proverbs',
        label: 'PROVERBS — BEGINNER',
        meta: 'DIFF 1.0 – 45.0',
        filter: l => l.category === 'Proverbs' && l.tier === 'Tier 1: Beginner'
      },
      {
        id: 'Proverbs-Intermediate',
        category: 'Proverbs',
        label: 'PROVERBS — INTERMEDIATE',
        meta: 'DIFF 45.1 – 65.0',
        filter: l => l.category === 'Proverbs' && l.tier === 'Tier 2: Intermediate'
      },
      {
        id: 'Proverbs-Advanced',
        category: 'Proverbs',
        label: 'PROVERBS — ADVANCED',
        meta: 'DIFF 65.1 – 80.0',
        filter: l => l.category === 'Proverbs' && l.tier === 'Tier 3: Advanced'
      },
      {
        id: 'Proverbs-Master',
        category: 'Proverbs',
        label: 'PROVERBS — MASTER',
        meta: 'DIFF 80.1 – 99.0',
        filter: l => l.category === 'Proverbs' && l.tier === 'Tier 4: Master'
      },
      {
        id: 'Riddles-Beginner',
        category: 'Riddles',
        label: 'RIDDLES — BEGINNER',
        meta: 'DIFF 1.0 – 45.0',
        filter: l => l.category === 'Riddles' && l.tier === 'Tier 1: Beginner'
      },
      {
        id: 'Riddles-Intermediate',
        category: 'Riddles',
        label: 'RIDDLES — INTERMEDIATE',
        meta: 'DIFF 45.1 – 65.0',
        filter: l => l.category === 'Riddles' && l.tier === 'Tier 2: Intermediate'
      },
      {
        id: 'Riddles-Advanced',
        category: 'Riddles',
        label: 'RIDDLES — ADVANCED',
        meta: 'DIFF 65.1 – 80.0',
        filter: l => l.category === 'Riddles' && l.tier === 'Tier 3: Advanced'
      },
      {
        id: 'Riddles-Master',
        category: 'Riddles',
        label: 'RIDDLES — MASTER',
        meta: 'DIFF 80.1 – 99.0',
        filter: l => l.category === 'Riddles' && l.tier === 'Tier 4: Master'
      },
      {
        id: 'Movie Lines-Beginner',
        category: 'Movie Lines',
        label: 'MOVIE LINES — BEGINNER',
        meta: 'DIFF 1.0 – 45.0',
        filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 1: Beginner'
      },
      {
        id: 'Movie Lines-Intermediate',
        category: 'Movie Lines',
        label: 'MOVIE LINES — INTERMEDIATE',
        meta: 'DIFF 45.1 – 65.0',
        filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 2: Intermediate'
      },
      {
        id: 'Movie Lines-Advanced',
        category: 'Movie Lines',
        label: 'MOVIE LINES — ADVANCED',
        meta: 'DIFF 65.1 – 80.0',
        filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 3: Advanced'
      },
      {
        id: 'Movie Lines-Master',
        category: 'Movie Lines',
        label: 'MOVIE LINES — MASTER',
        meta: 'DIFF 80.1 – 99.0',
        filter: l => l.category === 'Movie Lines' && l.tier === 'Tier 4: Master'
      },
      {
        id: 'Trivia-Beginner',
        category: 'Trivia',
        label: 'TRIVIA — BEGINNER',
        meta: 'DIFF 1.0 – 45.0',
        filter: l => l.category === 'Trivia' && l.tier === 'Tier 1: Beginner'
      },
      {
        id: 'Trivia-Intermediate',
        category: 'Trivia',
        label: 'TRIVIA — INTERMEDIATE',
        meta: 'DIFF 45.1 – 65.0',
        filter: l => l.category === 'Trivia' && l.tier === 'Tier 2: Intermediate'
      },
      {
        id: 'Trivia-Advanced',
        category: 'Trivia',
        label: 'TRIVIA — ADVANCED',
        meta: 'DIFF 65.1 – 80.0',
        filter: l => l.category === 'Trivia' && l.tier === 'Tier 3: Advanced'
      },
      {
        id: 'Trivia-Master',
        category: 'Trivia',
        label: 'TRIVIA — MASTER',
        meta: 'DIFF 80.1 – 99.0',
        filter: l => l.category === 'Trivia' && l.tier === 'Tier 4: Master'
      },
      {
        id: 'Wordplay-Beginner',
        category: 'Wordplay',
        label: 'WORDPLAY — BEGINNER',
        meta: 'DIFF 1.0 – 45.0',
        filter: l => l.category === 'Wordplay' && l.tier === 'Tier 1: Beginner'
      },
      {
        id: 'Wordplay-Intermediate',
        category: 'Wordplay',
        label: 'WORDPLAY — INTERMEDIATE',
        meta: 'DIFF 45.1 – 65.0',
        filter: l => l.category === 'Wordplay' && l.tier === 'Tier 2: Intermediate'
      },
      {
        id: 'Wordplay-Advanced',
        category: 'Wordplay',
        label: 'WORDPLAY — ADVANCED',
        meta: 'DIFF 65.1 – 80.0',
        filter: l => l.category === 'Wordplay' && l.tier === 'Tier 3: Advanced'
      },
      {
        id: 'Wordplay-Master',
        category: 'Wordplay',
        label: 'WORDPLAY — MASTER',
        meta: 'DIFF 80.1 – 99.0',
        filter: l => l.category === 'Wordplay' && l.tier === 'Tier 4: Master'
      },
      {
        id: 'Jokes-Beginner',
        category: 'Jokes',
        label: 'JOKES — BEGINNER',
        meta: 'DIFF 1.0 – 45.0',
        filter: l => l.category === 'Jokes' && l.tier === 'Tier 1: Beginner'
      },
      {
        id: 'Jokes-Intermediate',
        category: 'Jokes',
        label: 'JOKES — INTERMEDIATE',
        meta: 'DIFF 45.1 – 65.0',
        filter: l => l.category === 'Jokes' && l.tier === 'Tier 2: Intermediate'
      },
      {
        id: 'Jokes-Advanced',
        category: 'Jokes',
        label: 'JOKES — ADVANCED',
        meta: 'DIFF 65.1 – 80.0',
        filter: l => l.category === 'Jokes' && l.tier === 'Tier 3: Advanced'
      },
      {
        id: 'Jokes-Master',
        category: 'Jokes',
        label: 'JOKES — MASTER',
        meta: 'DIFF 80.1 – 99.0',
        filter: l => l.category === 'Jokes' && l.tier === 'Tier 4: Master'
      }
    ];

    // Filter sections to render
    const sectionsToRender = this.activeFilter === 'ALL'
      ? sectionsMeta
      : sectionsMeta.filter(s => s.category === this.activeFilter);

    this.contentContainer.innerHTML = sectionsToRender.map(sec => {
      const levels = LEVEL_DATA.filter(sec.filter);
      if (!levels.length) return '';
      const solvedInTier = levels.filter(l => this.storage && this.storage.isLevelCompleted(l.id - 1)).length;

      return `
        <div class="tier-section">
          <div class="tier-section-header">
            <span class="tier-section-title">${sec.label}</span>
            <span class="tier-section-meta">${solvedInTier}/${levels.length} SOLVED • ${sec.meta}</span>
          </div>
          <div class="level-grid">
            ${levels.map(l => {
              const idx = l.id - 1;
              const isSolved = this.storage ? this.storage.isLevelCompleted(idx) : false;
              const isInProgress = this.storage ? this.storage.hasLevelInProgress(idx) : false;
              const isCurrent = idx === currentIdx;
              const isSpecial = l.category && l.category !== 'Quotes';

              let cardClasses = 'level-card';
              if (isSolved) {
                cardClasses += ' solved';
              } else if (isCurrent) {
                cardClasses += ' current';
              } else if (isInProgress) {
                cardClasses += ' in-progress';
              }

              return `
                <div class="${cardClasses}" data-index="${idx}" role="button" tabindex="0" aria-label="${l.category} ${l.num}">
                  ${isSolved ? `<div class="level-card-badge-solved">${Icons.check(14)}</div>` : ''}
                  ${!isSolved && isInProgress ? `<div class="level-card-badge-progress" aria-label="Saved Midway Progress">●</div>` : ''}
                  <span class="level-card-num">${l.num}</span>
                  ${isSpecial ? `<span class="level-card-category-tag">${l.category}</span>` : ''}
                  <span class="level-card-diff">${l.diff}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // 5. Attach Click Handlers (All levels unlocked & playable)
    this.contentContainer.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index'), 10);
        if (this.audio) this.audio.playClick();
        if (this.onSelectLevel) {
          this.onSelectLevel(idx);
        }
      });
    });

    // 6. Auto-scroll to Current Level (if visible)
    requestAnimationFrame(() => {
      const currentEl = this.contentContainer.querySelector('.level-card.current');
      if (currentEl) {
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}
