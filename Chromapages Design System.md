# **Chromapages Design System v2.1: "Illuminated Precision" (Light Mode First)**

| System Metadata | Details |

| Status | Locked |

| Inspiration | "Light, Glass, & Swiss Type" |

| Primary Directive | Clean, High-Contrast Aesthetics |

## **1\. Core Philosophy**

We prioritize **Light Mode**. The system uses off-white backgrounds ("Stardust") and deep, dark typography to create a sense of cleanliness and precision. Depth is achieved through **white glassmorphism** and **colored shadows**, not darkness.

## **2\. Visual Primitives**

### **2.1 The "Light Glass" Effect**

Used for Cards, Navbars, and Overlays on light backgrounds.

* **Background:** bg-white/60 (Light Mode).  
* **Blur:** backdrop-blur-md.  
* **Border:** border border-white/40 (Subtle, crisp edge).  
* **Shadow:** shadow-lg shadow-brand-primary/5.

### **2.2 The "Colored Shadow" Effect**

Used to lift elements off the page.

* **Token:** shadow-xl shadow-brand-primary/10.  
* **Hover:** shadow-2xl shadow-brand-primary/20.

### **2.3 Typography: "Swiss Tech"**

* **H1 (Hero):** Montserrat **ExtraBold (800)**. Color: text-brand-primary (Deep Indigo).  
* **H2/H3 (Section Titles):** Montserrat **ExtraBold (800)**. Color: text-brand-ink.  
* **Body:** Inter. Color: text-slate-600.  
* **Micro-Labels:** JetBrains Mono. Color: text-brand-accent (Teal).

## **3\. Color System Updates**

| Token | Hex | Tailwind Usage | Role |

| Deep Indigo | \#2C3892 | bg-brand-primary | Text, Primary Buttons. |

| Electric Teal | \#23698C | bg-brand-accent | Highlights, Borders. |

| Stardust | \#EFEFED | bg-brand-base | Primary Canvas. |

| Void | \#030712 | bg-brand-ink | Footer/Contrast Sections. |

## **4\. Component Specs**

### **4.1 Buttons ("The Prism")**

* **Structure:** Solid Deep Indigo background.  
* **Hover:** Lifts (\-translate-y-0.5), Shadow grows.  
* **Text:** White, Bold, Wide Tracking.

### **4.2 Cards ("The Lens")**

* **Default:** White Glass (bg-white/60), blurred backdrop.  
* **Hover:** Solid White (bg-white), border becomes Teal.

### **4.3 Hero Section**

* **Background:** Stardust (\#EFEFED) with subtle, large gradient blobs (Teal/Indigo) fading into white.  
* **Content:** Dark, massive typography anchored on the light background.

## **5\. Animation (Motion Design)**

* **Entrance:** Fade Up (translate-y-4 opacity-0 \-\> translate-y-0 opacity-100).  
* **Hover:** Crisp spring physics.  
1. 