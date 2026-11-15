import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SiteFooter, FooterColumn } from '../../shared/ui/layout/site-footer';
import { SiteHeader, SiteLink } from '../../shared/ui/layout/site-header';

/** Ochiq sahifalar qobig'i: Header + Footer. */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-page' },
  template: `
    <app-site-header [links]="links" [authenticated]="auth.isAuthenticated()" />
    <main id="main" class="flex-1">
      <router-outlet />
    </main>
    <app-site-footer [columns]="footer" />
  `,
})
export class PublicLayout {
  protected readonly auth = inject(AuthService);

  // TODO(savol): "Narxlar" va footer'dagi Kompaniya/Yordam sahifalari Figma'da ham, API'da ham yo'q.
  protected readonly links: SiteLink[] = [
    { label: "Lug'at", link: '/vocabulary' },
    { label: "To'plamlar", link: '/decks' },
    { label: 'Mashqlar', link: '/study' },
    { label: 'Reyting', link: '/friends' },
    { label: 'Narxlar', link: '/' },
  ];

  protected readonly footer: FooterColumn[] = [
    {
      title: 'Mahsulot',
      links: [
        { label: "Lug'at", link: '/vocabulary' },
        { label: "To'plamlar", link: '/decks' },
        { label: 'Mashqlar', link: '/study' },
        { label: 'Narxlar', link: '/' },
      ],
    },
    {
      title: 'Kompaniya',
      links: [
        { label: 'Biz haqimizda', link: '/' },
        { label: 'Blog', link: '/' },
        { label: 'Aloqa', link: '/' },
      ],
    },
    {
      title: 'Yordam',
      links: [
        { label: 'Savol-javob', link: '/' },
        { label: 'Maxfiylik', link: '/' },
        { label: 'Shartlar', link: '/' },
      ],
    },
  ];
}
