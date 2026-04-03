/**
 * LoadingSpinnerComponent
 * 
 * A reusable loading indicator component that can be used throughout the application.
 * 
 * Features:
 * - Configurable size (small, medium, large)
 * - Optional overlay mode for blocking UI interactions
 * - Optional loading message
 * - Accessible with proper ARIA attributes
 * 
 * Usage:
 * ```html
 * <!-- Basic spinner -->
 * <app-loading-spinner />
 * 
 * <!-- Full-page overlay with message -->
 * <app-loading-spinner [overlay]="true" message="Loading data..." />
 * 
 * <!-- Small inline spinner -->
 * <app-loading-spinner size="small" />
 * ```
 */
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

/**
 * Available spinner sizes.
 * - small: 1rem - for inline indicators
 * - medium: 2rem - default size
 * - large: 3rem - for page-level loading
 */
type SpinnerSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-loading-spinner',
  imports: [NgClass, NgStyle],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  /**
   * Size of the spinner.
   * Affects the visual size of the loading indicator.
   * @default 'medium'
   */
  readonly size = input<SpinnerSize>('medium');

  /**
   * Whether to display the spinner with a full-screen overlay.
   * When true, blocks user interaction with the underlying content.
   * @default false
   */
  readonly overlay = input(false);

  /**
   * Optional message to display below the spinner.
   * Useful for providing context about what is loading.
   */
  readonly message = input<string | undefined>(undefined);

  /**
   * CSS class to apply for the spinner size.
   * Maps the size input to the appropriate Bootstrap class.
   */
  protected get sizeClass(): string {
    const sizeClasses: Record<SpinnerSize, string> = {
      small: 'spinner-border-sm',
      medium: '',
      large: 'spinner-lg',
    };
    return sizeClasses[this.size()];
  }

  /**
   * Inline styles for custom spinner sizes.
   * Bootstrap only provides sm variant, so we need custom styles for large.
   */
  protected get customStyles(): Record<string, string> {
    if (this.size() === 'large') {
      return {
        width: '3rem',
        height: '3rem',
        borderWidth: '0.35em',
      };
    }
    return {};
  }
}
