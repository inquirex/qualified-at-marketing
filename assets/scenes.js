/* ==========================================================================
   Scene data for the homepage theater.

   Every question, option label, estimate and routing tier below was taken from
   the live demo flows on qualified.at (tax-preparation, personal-injury,
   roofing) by walking each form end to end with the paragraph shown here. The
   dollar ranges are what the engine actually returned for these answers.

   The one thing the animation compresses is time: on the page the extraction
   and the remaining questions play out in seconds instead of a minute.
   ========================================================================== */

(function (global) {
  'use strict';

  /* Shared graph geometry, in the canvas's own 640 x 1240 coordinate space.
     Index 6 is the branch column; 7 is the path taken when the branch is not. */
  var LAYOUT = [
    { x: 40,  y: 8    },
    { x: 40,  y: 138  },
    { x: 40,  y: 288  },
    { x: 40,  y: 438  },
    { x: 40,  y: 568  },
    { x: 40,  y: 698  },
    { x: 350, y: 838  },
    { x: 40,  y: 838  },
    { x: 40,  y: 988  },
    { x: 40,  y: 1118 }
  ];

  var EDGES = [
    { from: 0, to: 1, kind: 'always' },
    { from: 1, to: 2, kind: 'always' },
    { from: 2, to: 3, kind: 'always' },
    { from: 3, to: 4, kind: 'always' },
    { from: 4, to: 5, kind: 'always' },
    { from: 5, to: 6, kind: 'branch' },
    { from: 5, to: 7, kind: 'else'   },
    { from: 6, to: 8, kind: 'rejoin' },
    { from: 7, to: 8, kind: 'always' },
    { from: 8, to: 9, kind: 'always' }
  ];

  var SCENES = {

    /* ---------------------------------------------------------------- tax */
    tax: {
      key: 'tax',
      label: 'Tax preparation',
      firm: 'Meridian Tax Partners',
      initial: 'M',
      accent: '#4263eb',
      demoUrl: '/demos/tax-preparation',
      windowTitle: 'flow builder — meridian tax partners',
      totalSteps: 18,

      prompt: 'I run a small tax practice. Ask enough to tell how complex ' +
              "someone's return is, and give them a fee range before we ever get on a call.",

      intro: 'A complexity read <strong>and</strong> a fee range, before the call. ' +
             "I'll open with one free-text question and let the model fill in whatever it can.",

      outro: 'Eighteen steps, three branches, one price accumulator. ' +
             'Want to see it the way a lead will?',

      branchLabel: '1 · business_entity = true',

      nodes: [
        { verb: 'say',     name: 'welcome',         text: "Meridian Tax Partners — a few questions and we'll size the job." },
        { verb: 'ask',     name: 'tell_me',         text: "In a few sentences, tell us about your tax situation this year — what's changed, and what you're worried about.", type: 'text' },
        { verb: 'clarify', name: 'extracted',       text: 'filing status · dependents · entity · rentals · investments', type: 'claude' },
        { verb: 'ask',     name: 'filing_status',   text: "What's your filing status?", type: 'enum', skip: true },
        { verb: 'ask',     name: 'dependents',      text: 'How many dependents will you claim?', type: 'integer', skip: true },
        { verb: 'confirm', name: 'business_entity', text: 'Do you own a business entity (LLC, S-corp, or partnership)?', type: 'boolean', skip: true },
        { verb: 'ask',     name: 'entity_type',     text: 'What kind of entity is it?', type: 'enum', skip: true },
        { verb: 'ask',     name: 'rental_count',    text: 'How many rental properties do you own?', type: 'integer', skip: true },
        { verb: 'confirm', name: 'irs_letters',     text: 'Have you received any letters from the IRS this year?', type: 'boolean' },
        { verb: 'say',     name: 'estimate',        text: 'Your fee range, and the tier the firm sees.', type: '∑ price' }
      ],

      leadQuestion: "In a few sentences, tell us about your tax situation this year — what's changed, and what you're worried about.",

      paragraph: "I'm married filing jointly with two kids. I'm on a W-2 at a tech company, " +
                 'my wife runs a consulting LLC, and we own one rental duplex in Oakland. ' +
                 'We also sold some crypto on Coinbase last year. We live in California all year.',

      facts: [
        { field: 'filing_status',    value: 'married_jointly', node: 3 },
        { field: 'dependents',       value: '2',               node: 4 },
        { field: 'business_entity',  value: 'true',            node: 5 },
        { field: 'entity_type',      value: 'llc',             node: 6 },
        { field: 'rental_count',     value: '1',               node: 7 },
        { field: 'self_employment',  value: 'true'  },
        { field: 'sold_investments', value: 'true'  }
      ],

      remaining: [
        { q: 'Do you run payroll for employees?',                  opts: ['Yes', 'No'], pick: 1 },
        { q: 'Did you pay any 1099 contractors?',                  opts: ['Yes', 'No'], pick: 1 },
        { q: 'Did you live or work in more than one state?',        opts: ['Yes', 'No'], pick: 1 },
        { q: 'Have you received any letters from the IRS this year?', opts: ['Yes', 'No'], pick: 1 }
      ],

      privacy: 'Nothing it asked identifies you. No name, no email, no Social. ' +
               'The range below came from the shape of the work.',

      estimate: {
        label: 'Your estimate',
        low: 1400,
        high: 2000,
        note: 'This one needs a senior preparer — a business entity, a rental and ' +
              'investment sales all carry review time.'
      },

      firmCard: {
        tier: 'Group 3',
        route: 'Routed straight to a partner, before anyone picked up a phone.'
      }
    },

    /* ------------------------------------------------------------- injury */
    injury: {
      key: 'injury',
      label: 'Personal injury',
      firm: 'Halloran & Reeve',
      initial: 'H',
      accent: '#b45309',
      demoUrl: '/demos/personal-injury',
      windowTitle: 'flow builder — halloran & reeve',
      totalSteps: 24,

      prompt: 'Personal injury firm. I need to know whether a case is worth a callback ' +
              'today — and the caller should see what it might be worth, not what I charge.',

      intro: 'So the visitor gets a <strong>value range</strong>, and you get a tier. ' +
             "I'll let them tell the story first and pull the facts out of it.",

      outro: 'Twenty-four steps, four branches. The value model is an accumulator, ' +
             'so it moves as they answer. Preview it?',

      branchLabel: '1 · still_treating = true',

      nodes: [
        { verb: 'say',     name: 'welcome',        text: "Halloran & Reeve — tell us what happened and we'll tell you where you stand." },
        { verb: 'ask',     name: 'what_happened',  text: "Tell us what happened, in your own words. There's no wrong way to say it.", type: 'text' },
        { verb: 'clarify', name: 'extracted',      text: 'incident · timing · treatment · fault · work missed', type: 'claude' },
        { verb: 'ask',     name: 'incident_type',  text: 'What kind of incident was it?', type: 'enum', skip: true },
        { verb: 'ask',     name: 'when',           text: 'Roughly how long ago did this happen?', type: 'enum', skip: true },
        { verb: 'confirm', name: 'still_treating', text: 'Are you still being treated?', type: 'boolean', skip: true },
        { verb: 'ask',     name: 'providers',      text: 'How many different doctors or clinics have you seen so far?', type: 'integer' },
        { verb: 'ask',     name: 'fault',          text: 'As best you can tell, who caused it?', type: 'enum', skip: true },
        { verb: 'confirm', name: 'represented',    text: 'Is another lawyer already representing you on this?', type: 'boolean', skip: true },
        { verb: 'say',     name: 'case_value',     text: 'A value range for them, a tier for you.', type: '∑ value' }
      ],

      leadQuestion: "Tell us what happened, in your own words. There's no wrong way to say it — start wherever it makes sense to you.",

      paragraph: 'I was rear-ended at a red light in Sacramento about three weeks ago. ' +
                 'The other driver was on his phone and got a ticket. I went to the ER that ' +
                 "night and I'm still in physical therapy for my neck. I missed two weeks of " +
                 'work. No lawyer yet.',

      facts: [
        { field: 'incident_type',  value: 'auto_accident', node: 3 },
        { field: 'when',           value: 'weeks',         node: 4 },
        { field: 'still_treating', value: 'true',          node: 5 },
        { field: 'fault',          value: 'other_party',   node: 7 },
        { field: 'represented',    value: 'false',         node: 8 },
        { field: 'role',           value: 'driver'  },
        { field: 'saw_doctor',     value: 'true'    },
        { field: 'police_report',  value: 'true'    },
        { field: 'missed_work',    value: 'true'    },
        { field: 'time_missed',    value: 'weeks'   }
      ],

      remaining: [
        { q: 'How many different doctors or clinics have you seen so far?', kind: 'number', value: '2' },
        { q: 'Did any of it involve surgery or a stay in the hospital?',    opts: ['Yes', 'No'], pick: 1 },
        { q: 'Which of these comes closest to your injuries?',             opts: ['Bruising, sprains, or whiplash', 'Broken bones or torn ligaments', 'A head, neck, or back injury', 'Something that may not fully heal'], pick: 0 },
        { q: 'Do you know whether the other side had insurance?',          opts: ['Yes, they were insured', "No, they weren't", "I don't know yet"], pick: 0 }
      ],

      privacy: 'It never asked your name, your number, or for a medical record. ' +
               'The range came from the shape of the case.',

      estimate: {
        label: 'Potential case value',
        low: 28000,
        high: 60000,
        note: "A working midpoint, not a promise — the range narrows as treatment " +
              'finishes and the bills come in.'
      },

      firmCard: {
        tier: 'Group 2',
        route: 'Routed to an associate attorney, with the callback already prioritised.'
      }
    },

    /* ------------------------------------------------------------ roofing */
    roofing: {
      key: 'roofing',
      label: 'Roofing',
      firm: 'Ironvane Roofing',
      initial: 'I',
      accent: '#0ca678',
      demoUrl: '/demos/roofing',
      windowTitle: 'flow builder — ironvane roofing',
      totalSteps: 22,

      prompt: 'Roofing company. Squares, pitch, material and whether a storm is involved — ' +
              'then give them a real number so they stop calling three contractors.',

      intro: 'Squares × pitch × material, as a live accumulator. ' +
             "I'll ask for the story once and read the measurements out of it.",

      outro: 'Twenty-two steps, and the emergency path jumps the queue. ' +
             'Have a look at it as a homeowner?',

      branchLabel: '1 · insurance_claim = true',

      nodes: [
        { verb: 'say',     name: 'welcome',          text: "Ironvane Roofing — a minute of questions and you'll know what to expect." },
        { verb: 'ask',     name: 'whats_going_on',   text: "Tell us about your roof and what's going on with it — age, material, what you're seeing.", type: 'text' },
        { verb: 'clarify', name: 'extracted',        text: 'job type · size · material · age · storm', type: 'claude' },
        { verb: 'confirm', name: 'water_now',        text: 'Is water getting into the house right now?', type: 'boolean', skip: true },
        { verb: 'ask',     name: 'job_type',         text: 'Are we fixing something, or replacing the roof?', type: 'enum', skip: true },
        { verb: 'confirm', name: 'insurance_claim',  text: 'Are you filing an insurance claim for it?', type: 'boolean', skip: true },
        { verb: 'ask',     name: 'claim_stage',      text: 'Where does the claim stand?', type: 'enum' },
        { verb: 'ask',     name: 'roof_sqft',        text: 'Roughly how many square feet of roof are we working on?', type: 'integer', skip: true },
        { verb: 'ask',     name: 'pitch',            text: 'How steep is it?', type: 'enum' },
        { verb: 'say',     name: 'estimate',         text: 'A real number, before a truck leaves the yard.', type: '∑ price' }
      ],

      leadQuestion: "Tell us about your roof and what's going on with it — age, material, what you're seeing, and whether a storm had anything to do with it.",

      paragraph: 'Our single-story ranch in Fresno has a 25 year old asphalt shingle roof, ' +
                 'about 1,800 square feet, and it started leaking over the garage after the ' +
                 'last storm. We think we want architectural shingles. No insurance claim.',

      facts: [
        { field: 'water_intrusion',  value: 'true',             node: 3 },
        { field: 'job_type',         value: 'full_replacement', node: 4 },
        { field: 'insurance_claim',  value: 'false',            node: 5 },
        { field: 'roof_sqft',        value: '1800',             node: 7 },
        { field: 'roof_age',         value: 'over_20'  },
        { field: 'current_material', value: 'asphalt_3tab' },
        { field: 'stories',          value: 'one'      },
        { field: 'storm_damage',     value: 'true'     }
      ],

      remaining: [
        { q: 'How steep is it?', opts: ['Flat or very low slope', 'Normal — you could walk it', "Steep — you'd need to be tied off"], pick: 1 },
        { q: "Anything else on the exterior while we're set up?", opts: ['Roof only', 'Gutters and downspouts', 'Attic ventilation', 'Skylights'], pick: 0 },
        { q: 'When do you need this done?', opts: ['Emergency — this week', 'Next few weeks', 'Planning ahead, a few months out', 'Just gathering numbers'], pick: 1 }
      ],

      privacy: 'No name, no email, not even the address of the house. ' +
               'The number came from the shape of the work.',

      estimate: {
        label: 'Your estimate',
        low: 10000,
        high: 15000,
        note: 'Senior estimator on the roof before anyone quotes it firm — access, ' +
              'material and claim status all move the number.'
      },

      firmCard: {
        tier: 'Group 3',
        route: 'Routed straight to the owner, with active water intrusion flagged.'
      }
    }
  };

  /* Copilot "tool call" lines, one per node, derived from the node list so the
     two can never drift apart. */
  function opsFor(scene) {
    return scene.nodes.map(function (node, i) {
      if (node.verb === 'clarify') {
        return { kind: 'ai', op: '+ clarify', name: node.name, note: 'model reads the paragraph' };
      }
      if (i === 6) {
        return { kind: 'branch', op: '⑃ branch', name: node.name, note: scene.branchLabel.replace(/^1 · /, '') };
      }
      if (i === 9) {
        return { kind: 'branch', op: '∑ accumulate', name: node.name, note: (node.type || '').replace('∑ ', '') };
      }
      return { kind: 'ok', op: '+ ' + node.verb, name: node.name, note: node.type ? ':' + node.type : '' };
    });
  }

  Object.keys(SCENES).forEach(function (key) {
    SCENES[key].ops = opsFor(SCENES[key]);
  });

  global.QA_SCENES = { scenes: SCENES, layout: LAYOUT, edges: EDGES, order: ['tax', 'injury', 'roofing'] };
})(window);
