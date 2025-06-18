# Survey App Architecture

## Overview

This survey app follows a modular, component-based architecture with clear separation of concerns. The codebase is organized into logical folders for better maintainability and scalability.

## Folder Structure

```
survey-mobile-app/
├── app/
│   └── index.tsx                 # Main app entry point
├── components/
│   ├── SharedLayout.tsx          # Shared background and header
│   ├── SurveyCard.tsx           # Survey form component
│   ├── ThankYouCard.tsx         # Thank you screen component
│   └── index.ts                 # Component exports
├── constants/
│   └── surveyData.ts            # Survey options and config
├── hooks/
│   └── useSurvey.ts             # Custom survey state hook
├── styles/
│   └── surveyStyles.ts          # All StyleSheet definitions
└── types/
    └── survey.ts                # TypeScript interfaces
```

## Architecture Principles

### 1. Single Responsibility Principle

- Each component has one clear purpose
- Styles are separated from component logic
- Business logic is extracted into custom hooks

### 2. DRY (Don't Repeat Yourself)

- Shared layout eliminates duplicate background/header code
- Common styles are centralized
- Reusable components reduce code duplication

### 3. Separation of Concerns

- **Components**: UI rendering and user interactions
- **Hooks**: State management and business logic
- **Constants**: Static data and configuration
- **Types**: TypeScript interface definitions
- **Styles**: Visual styling definitions

## Key Components

### SharedLayout

- Renders common background image
- Displays government logos and department info
- Provides consistent layout structure
- Wraps dynamic card content

### SurveyCard

- Handles survey form display
- Manages option selection state
- Processes user interactions
- Triggers submission callbacks

### ThankYouCard

- Shows completion message
- Auto-resets after configured delay
- Clean, simple success feedback

### useSurvey Hook

- Manages survey submission state
- Provides submit and reset functions
- Encapsulates business logic
- Uses useCallback for performance

## Benefits

1. **Maintainability**: Easy to modify individual components
2. **Testability**: Each module can be tested independently
3. **Reusability**: Components can be reused in other parts of the app
4. **Performance**: Shared layout prevents unnecessary re-renders
5. **Developer Experience**: Clear structure makes onboarding easier
6. **Type Safety**: TypeScript interfaces ensure code reliability

## Development Guidelines

1. Keep components focused on a single responsibility
2. Use custom hooks for complex state logic
3. Define interfaces for all props and data structures
4. Group related styles in the same file
5. Export components through index files for clean imports
6. Use meaningful names that describe component purpose

## Future Enhancements

- Add loading screen component
- Implement error handling
- Add form validation
- Create animation utilities
- Add internationalization support
- Implement analytics tracking
